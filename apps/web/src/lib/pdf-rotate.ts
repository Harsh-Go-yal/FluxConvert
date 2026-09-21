import { PDFDocument, degrees } from 'pdf-lib';

export type RotationAngle = 0 | 90 | 180 | 270;

export interface RotateOptions {
  /** Optional document title to embed in the output PDF metadata. */
  title?: string;
  /** Optional author metadata. */
  author?: string;
  /** Called with a 0-100 progress value as pages are rotated. */
  onProgress?: (percent: number) => void;
}

/**
 * Normalize a Uint8Array into a plain ArrayBuffer-backed view so it can be
 * safely used as a BlobPart. pdf-lib may return views backed by
 * ArrayBufferLike (e.g. SharedArrayBuffer), which TypeScript rejects.
 */
function toArrayBufferView(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

/**
 * Normalize an arbitrary angle into one of the four cardinal rotations.
 */
export function normalizeAngle(angle: number): RotationAngle {
  const mod = ((angle % 360) + 360) % 360;
  const snapped = Math.round(mod / 90) * 90;
  return (((snapped % 360) + 360) % 360) as RotationAngle;
}

/**
 * Rotate every page of a PDF by the given angle, entirely in the browser.
 * The rotation is applied additively on top of any existing page rotation.
 */
export async function rotatePdfPages(
  file: File | Blob,
  angle: RotationAngle,
  options: RotateOptions = {},
): Promise<Uint8Array> {
  const delta = normalizeAngle(angle);
  if (delta === 0) {
    throw new Error('Choose a rotation of 90, 180, or 270 degrees.');
  }

  const { title, author, onProgress } = options;
  const bytes = new Uint8Array(await file.arrayBuffer());

  let source: PDFDocument;
  try {
    source = await PDFDocument.load(bytes, { ignoreEncryption: true });
  } catch {
    const name = (file as File).name ?? 'the document';
    throw new Error(
      `Could not read "${name}". It may be corrupted or password-protected.`,
    );
  }

  if (title) source.setTitle(title);
  if (author) source.setAuthor(author);
  source.setProducer('FluxConvert');
  source.setCreator('FluxConvert');

  const pages = source.getPages();
  const total = pages.length;

  pages.forEach((page, i) => {
    const current = page.getRotation().angle ?? 0;
    page.setRotation(degrees(normalizeAngle(current + delta)));
    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 100));
    }
  });

  return source.save();
}

/**
 * Convenience helper that rotates a PDF and returns a downloadable Blob.
 */
export async function rotatePdfToBlob(
  file: File | Blob,
  angle: RotationAngle,
  options: RotateOptions = {},
): Promise<Blob> {
  const bytes = await rotatePdfPages(file, angle, options);
  return new Blob([toArrayBufferView(bytes)], { type: 'application/pdf' });
}

/**
 * Trigger a browser download for a PDF blob without leaking object URLs.
 */
export function downloadPdf(blob: Blob, filename = 'rotated.pdf'): void {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick so Safari has time to start the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
