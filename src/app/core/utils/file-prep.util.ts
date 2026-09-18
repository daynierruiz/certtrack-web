/**
 * Client-side preparation of files before upload / AI extraction.
 *
 * Mobile cameras produce files the backend and the AI API cannot take as-is:
 * iPhones deliver HEIC unless the file input forces a transcode, and modern
 * phone photos routinely exceed the 5MB-per-image limit of the Anthropic API
 * even though the backend accepts up to 10MB. Re-encoding here keeps every
 * photo within limits and cuts upload time on mobile data.
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

/** Below this size and dimension, re-encoding is not worth the quality loss. */
const RECOMPRESS_BYTES_THRESHOLD = 1.5 * 1024 * 1024;

export class UnsupportedFileError extends Error {
  constructor(public readonly fileName: string) {
    super(`Unsupported file: ${fileName}`);
  }
}

/**
 * Returns a file safe to send to the backend and the AI API. Images that are
 * oversized, over-resolution, or in a browser-decodable but backend-rejected
 * format (e.g. HEIC on Safari) are re-encoded as JPEG. PDFs and already-small
 * accepted images pass through untouched.
 *
 * @throws UnsupportedFileError when the file is neither accepted by the
 *         backend nor decodable by this browser (e.g. HEIC on Chrome).
 */
export async function prepareFileForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    if (BACKEND_ALLOWED_TYPES.has(file.type)) return file;
    throw new UnsupportedFileError(file.name);
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Browser can't decode it (HEIC outside Safari, corrupt file, ...).
    if (BACKEND_ALLOWED_TYPES.has(file.type)) return file;
    throw new UnsupportedFileError(file.name);
  }

  try {
    const needsRecompress =
      !BACKEND_ALLOWED_TYPES.has(file.type) ||
      file.size > RECOMPRESS_BYTES_THRESHOLD ||
      Math.max(bitmap.width, bitmap.height) > MAX_DIMENSION;

    if (!needsRecompress) return file;

    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      if (BACKEND_ALLOWED_TYPES.has(file.type)) return file;
      throw new UnsupportedFileError(file.name);
    }
    // JPEG has no alpha — flatten on white so transparent PNGs don't turn black.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    let blob = await canvasToJpeg(canvas, 0.85);
    if (blob.size > MAX_IMAGE_BYTES) {
      blob = await canvasToJpeg(canvas, 0.7);
    }

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      b => b ? resolve(b) : reject(new Error('Canvas encoding failed')),
      'image/jpeg', quality);
  });
}
