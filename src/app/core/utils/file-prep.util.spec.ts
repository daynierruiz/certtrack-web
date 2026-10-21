import { prepareFileForUpload, UnsupportedFileError, UPLOAD_ACCEPT, estimateSharpness, BLUR_VARIANCE_THRESHOLD } from './file-prep.util';

/** 1x1 transparent PNG (valid, decodable by the browser). */
const PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function base64ToFile(base64: string, name: string, type: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], name, { type });
}

/** Draws a solid rectangle and encodes it as a real PNG File via canvas. */
async function makePngFile(width: number, height: number, name: string): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2d context unavailable in test browser');
  }
  ctx.fillStyle = '#3366cc';
  ctx.fillRect(0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png'));
  return new File([blob], name, { type: 'image/png' });
}

describe('file-prep.util', () => {

  describe('UPLOAD_ACCEPT', () => {
    it('lists explicit image types plus PDF (no image/* wildcard)', () => {
      expect(UPLOAD_ACCEPT).toBe('image/jpeg,image/png,image/webp,image/gif,application/pdf');
      expect(UPLOAD_ACCEPT).not.toContain('image/*');
    });
  });

  describe('prepareFileForUpload', () => {
    it('passes a PDF through untouched (same File instance)', async () => {
      const pdf = new File(['%PDF-1.4 fake content'], 'contract.pdf', { type: 'application/pdf' });

      const result = await prepareFileForUpload(pdf);

      expect(result).toBe(pdf);
    });

    it('rejects a non-image, non-accepted type with UnsupportedFileError', async () => {
      const txt = new File(['hello'], 'notes.txt', { type: 'text/plain' });

      await expectAsync(prepareFileForUpload(txt)).toBeRejectedWithError(UnsupportedFileError);
    });

    it('exposes the offending file name on UnsupportedFileError', async () => {
      const txt = new File(['hello'], 'notes.txt', { type: 'text/plain' });

      try {
        await prepareFileForUpload(txt);
        fail('expected prepareFileForUpload to throw');
      } catch (e) {
        expect(e instanceof UnsupportedFileError).toBeTrue();
        expect((e as UnsupportedFileError).fileName).toBe('notes.txt');
      }
    });

    it('re-encodes even a small accepted image to JPEG (bakes EXIF orientation + enhancement)', async () => {
      const png = base64ToFile(PNG_1X1_BASE64, 'tiny.png', 'image/png');

      const result = await prepareFileForUpload(png);

      // New contract: decodable images always go through the canvas pipeline so
      // orientation is baked and legibility enhancement is applied.
      expect(result).not.toBe(png);
      expect(result.type).toBe('image/jpeg');
      expect(result.name).toBe('tiny.jpg');
    });

    it('returns an undecodable file as-is when its type is backend-accepted', async () => {
      // Garbage bytes labeled image/png: createImageBitmap rejects, but the
      // backend accepts the type, so the file must pass through unchanged.
      const corrupt = new File([new Uint8Array([1, 2, 3, 4])], 'corrupt.png', { type: 'image/png' });

      const result = await prepareFileForUpload(corrupt);

      expect(result).toBe(corrupt);
    });

    it('rejects an undecodable file whose type the backend does not accept (HEIC on Chrome)', async () => {
      const heic = new File([new Uint8Array([1, 2, 3, 4])], 'photo.heic', { type: 'image/heic' });

      await expectAsync(prepareFileForUpload(heic)).toBeRejectedWithError(UnsupportedFileError);
    });

    it('re-encodes a decodable image of a backend-rejected type as JPEG with .jpg name', async () => {
      // PNG bytes labeled image/tiff: the browser decodes it (content sniffing)
      // but the backend rejects the declared type, so it must be re-encoded.
      const mislabeled = base64ToFile(PNG_1X1_BASE64, 'scan.tiff', 'image/tiff');

      const result = await prepareFileForUpload(mislabeled);

      expect(result).not.toBe(mislabeled);
      expect(result.type).toBe('image/jpeg');
      expect(result.name).toBe('scan.jpg');
    });

    it('downscales an over-resolution image to max 2000px, preserving aspect ratio', async () => {
      const big = await makePngFile(2200, 110, 'big.png');

      const result = await prepareFileForUpload(big);

      expect(result.type).toBe('image/jpeg');
      expect(result.name).toBe('big.jpg');

      const bitmap = await createImageBitmap(result);
      expect(bitmap.width).toBe(2000);
      expect(bitmap.height).toBe(Math.round(110 * (2000 / 2200)));
      bitmap.close();
    });

    it('re-encodes an at/under-cap image to JPEG without changing its dimensions', async () => {
      const atCap = await makePngFile(50, 50, 'small.png');

      const result = await prepareFileForUpload(atCap);

      expect(result).not.toBe(atCap);
      expect(result.type).toBe('image/jpeg');
      expect(result.name).toBe('small.jpg');

      const bitmap = await createImageBitmap(result);
      expect(bitmap.width).toBe(50);
      expect(bitmap.height).toBe(50);
      bitmap.close();
    });
  });

  describe('estimateSharpness', () => {
    it('returns null for a non-image file', async () => {
      const pdf = new File(['%PDF-1.4'], 'doc.pdf', { type: 'application/pdf' });

      const result = await estimateSharpness(pdf);

      expect(result).toBeNull();
    });

    it('returns a (near-zero) number for a flat, detail-free image', async () => {
      const flat = await makePngFile(120, 120, 'flat.png');

      const result = await estimateSharpness(flat);

      expect(result).not.toBeNull();
      expect(result as number).toBeGreaterThanOrEqual(0);
      // A solid colour has no edges, so the Laplacian variance is ~0.
      expect(result as number).toBeLessThan(BLUR_VARIANCE_THRESHOLD);
    });
  });
});
