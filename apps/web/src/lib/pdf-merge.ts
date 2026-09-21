import { PDFDocument } from 'pdf-lib';

export interface MergePdfOptions {
  /** Optional document title to embed in the output PDF metadata. */
  title?: string;
  /** Optional author metadata. */
  author?: string;
  /** Called with a 0-100 progress value as documents are merged. */
  onProgress?: (percent: number, index: number, total: number) => void;
  /** Optional AbortSignal to cancel a long-running merge. */
  signal?: AbortSignal;
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
 * Merge multiple PDF files into a single document, entirely in the browser.
 * The order of the input array determines the page order in the output.
 */
export async function mergePdfs(
  files: Array<File | Blob>,
  options: MergePdfOptions = {},
): Promise<Uint8Array> {
  const { title, author, onProgress, signal } = options;

  if (!files.length) {
    throw new Error('Add at least one PDF to merge.');
  }

  const output = await PDFDocument.create();
  if (title) output.setTitle(title);
  if (author) output.setAuthor(author);
  output.setProducer('FluxConvert');
  output.setCreator('FluxConvert');

  for (let i = 0; i < files.length; i++) {
    if (signal?.aborted) {
      throw new Error('Merge was cancelled.');
    }

    const file = files[i];
    const bytes = new Uint8Array(await file.arrayBuffer());

    let source: PDFDocument;
    try {
      source = await PDFDocument.load(bytes, { ignoreEncryption: true });
    } catch {
      const name = (file as File).name ?? `document ${i + 1}`;
      throw new Error(
        `Could not read "${name}". It may be corrupted or password-protected.`,
      );
    }

    const indices = source.getPageIndices();
    const copied = await output.copyPages(source, indices);
    copied.forEach((page) => output.addPage(page));

    if (onProgress) {
      onProgress(
        Math.round(((i + 1) / files.length) * 100),
        i + 1,
        files.length,
      );
    }
  }

  return output.save();
}

/**
 * Convenience helper that merges PDFs and returns a downloadable Blob.
 */
export async function mergePdfsToBlob(
  files: Array<File | Blob>,
  options: MergePdfOptions = {},
): Promise<Blob> {
  const bytes = await mergePdfs(files, options);
  return new Blob([toArrayBufferView(bytes)], { type: 'application/pdf' });
}

/**
 * Trigger a browser download for a merged PDF without leaking object URLs.
 */
export function downloadMergedPdf(blob: Blob, filename = 'merged.pdf'): void {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
