/**
 * Client-side preparation of files before upload / AI extraction.
 *
 * Mobile cameras produce files the backend and the AI API cannot take as-is:
 * iPhones deliver HEIC unless the file input forces a transcode, and modern
 * phone photos routinely exceed the 5MB-per-image limit of the Anthropic API
 * even though the backend accepts up to 10MB. Re-encoding here keeps every
 * photo within limits and cuts upload time on mobile data.
 *
 * For document photos it ALSO improves legibility: EXIF orientation is baked
 * into the pixels (so a sideways phone photo doesn't upload rotated) and a
 * gentle, color-preserving auto-contrast pass lifts faded / low-light scans.
 */

/** Value for the file input's `accept` attribute. Listing explicit image types
 *  (instead of `image/*`) makes iOS Safari transcode camera HEIC photos to
 *  JPEG before handing them over. */
export const UPLOAD_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf';

/** Types the backend accepts (DocumentService / AiExtractionController). */
const BACKEND_ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'
]);

/** Anthropic rejects images over 5MB — stay comfortably below. */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Documents don't need more resolution than this to be readable. */
const MAX_DIMENSION = 2000;

export class UnsupportedFileError extends Error {
  constructor(public readonly fileName: string) {
    super(`Unsupported file: ${fileName}`);
  }
}

/**
 * Returns a file safe to send to the backend and the AI API. Images are
 * auto-oriented (EXIF), downscaled to {@link MAX_DIMENSION}, contrast-enhanced
 * for legibility and re-encoded as JPEG. PDFs pass through untouched. Images in
 * a browser-decodable but backend-rejected format (e.g. HEIC on Safari) are
 * transcoded; a format the browser cannot decode at all throws.
 *
 * @throws UnsupportedFileError when the file is neither accepted by the
 *         backend nor decodable by this browser (e.g. HEIC on Chrome).
 */
export interface PrepareOptions {
  /** Longest-edge cap in px (default {@link MAX_DIMENSION} = 2000). */
  maxDimension?: number;
  /** Target max output size in bytes; quality is stepped down to fit (default 4MB). */
  maxBytes?: number;
}

export async function prepareFileForUpload(file: File, opts: PrepareOptions = {}): Promise<File> {
  const maxDimension = opts.maxDimension ?? MAX_DIMENSION;
  const maxBytes = opts.maxBytes ?? MAX_IMAGE_BYTES;
  if (!file.type.startsWith('image/')) {
    if (BACKEND_ALLOWED_TYPES.has(file.type)) return file;
    throw new UnsupportedFileError(file.name);
  }

  let bitmap: ImageBitmap;
  try {
    // imageOrientation 'from-image' honours EXIF so camera photos taken in
    // portrait/landscape are drawn (and therefore baked) the right way up.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Browser can't decode it (HEIC outside Safari, corrupt file, ...).
    if (BACKEND_ALLOWED_TYPES.has(file.type)) return file;
    throw new UnsupportedFileError(file.name);
  }

  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      if (BACKEND_ALLOWED_TYPES.has(file.type)) return file;
      throw new UnsupportedFileError(file.name);
    }
    // JPEG has no alpha — flatten on white so transparent PNGs don't turn black.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    // Gentle, colour-preserving contrast stretch to improve legibility of faded
    // or dimly-lit document photos. Best-effort: never block an upload on it.
    try {
      autoContrast(ctx, width, height);
    } catch {
      /* leave the un-enhanced pixels in place */
    }

    let blob = await canvasToJpeg(canvas, 0.9);
    if (blob.size > maxBytes) blob = await canvasToJpeg(canvas, 0.8);
    if (blob.size > maxBytes) blob = await canvasToJpeg(canvas, 0.7);
    if (blob.size > maxBytes) blob = await canvasToJpeg(canvas, 0.6);

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
}

/**
 * Rough focus/sharpness score for an image (variance of the Laplacian over a
 * downscaled grayscale copy). Higher = sharper. Returns `null` when it can't be
 * computed. Used only to warn the user about an obviously blurry capture — it is
 * a heuristic, never a hard gate.
 */
export async function estimateSharpness(file: File): Promise<number | null> {
  if (!file.type.startsWith('image/')) return null;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return null;
  }
  try {
    // Work on a small copy: sharpness is scale-sensitive, so normalising the
    // longest edge to ~800px keeps the threshold meaningful across resolutions.
    const target = 800;
    const scale = Math.min(1, target / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    // Grayscale buffer.
    const gray = new Float32Array(w * h);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // 3x3 Laplacian; accumulate mean and variance of the response (interior pixels).
    let sum = 0;
    let sumSq = 0;
    let count = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const lap =
          4 * gray[idx] - gray[idx - 1] - gray[idx + 1] - gray[idx - w] - gray[idx + w];
        sum += lap;
        sumSq += lap * lap;
        count++;
      }
    }
    if (count === 0) return null;
    const mean = sum / count;
    return sumSq / count - mean * mean; // variance
  } finally {
    bitmap.close();
  }
}

/**
 * Below this variance-of-Laplacian the capture is likely out of focus. Heuristic,
 * tuned for ~800px document photos; used only to surface a soft "looks blurry"
 * hint, so an occasional false positive just shows a dismissable warning.
 */
export const BLUR_VARIANCE_THRESHOLD = 120;

/**
 * Colour-preserving auto-contrast: stretches the luminance range between its
 * 0.5th and 99.5th percentiles and applies the SAME linear map to R, G and B so
 * contrast lifts without introducing a colour cast. No-op on already-full-range
 * or flat images.
 */
function autoContrast(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const pixels = width * height;

  // Luminance histogram.
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) | 0;
    hist[lum]++;
  }

  // 0.5% / 99.5% percentile cutoffs.
  const lowCount = pixels * 0.005;
  const highCount = pixels * 0.995;
  let acc = 0;
  let low = 0;
  let high = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= lowCount) { low = v; break; }
  }
  acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= highCount) { high = v; break; }
  }

  // Nothing useful to stretch.
  if (high - low < 16) return;

  const scale = 255 / (high - low);
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    lut[v] = (v - low) * scale;
  }

  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]];
    data[i + 1] = lut[data[i + 1]];
    data[i + 2] = lut[data[i + 2]];
    // alpha untouched
  }
  ctx.putImageData(image, 0, 0);
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      b => b ? resolve(b) : reject(new Error('Canvas encoding failed')),
      'image/jpeg', quality);
  });
}
