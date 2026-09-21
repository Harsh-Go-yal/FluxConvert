import { PDFDocument } from 'pdf-lib';

export interface SplitOptions {
  /** Optional document title to embed in the output PDF metadata. */
  title?: string;
  /** Optional author metadata. */
  author?: string;
  /** Called with a 0-100 progress value as pages are copied. */
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
 * Parse a human-friendly page range string such as "1-3, 5, 8-10" into a
 * sorted, de-duplicated list of 1-based page numbers.
 *
 * Throws a descriptive error when the input is malformed or out of bounds.
 */
export function parsePageRanges(input: string, pageCount: number): number[] {
  const trimmed = (input ?? '').trim();
  if (!trimmed) {
    throw new Error('Enter at least one page or range (e.g. 1-3, 5).');
  }

  const pages = new Set<number>();
  const parts = trimmed.split(',');

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;

    const rangeMatch = part.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number.parseInt(rangeMatch[1], 10);
      const end = Number.parseInt(rangeMatch[2], 10);
      if (start < 1 || end < 1) {
        throw new Error(`Page numbers must be 1 or greater (got "${part}").`);
      }
      if (start > end) {
        throw new Error(`Range "${part}" is reversed. Use ${end}-${start} instead.`);
      }
      if (end > pageCount) {
        throw new Error(`Range "${part}" exceeds the document (${pageCount} pages).`);
      }
      for (let p = start; p <= end; p += 1) pages.add(p);
      continue;
    }

    const singleMatch = part.match(/^(\d+)$/);
    if (singleMatch) {
      const page = Number.parseInt(singleMatch[1], 10);
      if (page < 1) {
        throw new Error(`Page numbers must be 1 or greater (got "${part}").`);
      }
      if (page > pageCount) {
        throw new Error(`Page ${page} exceeds the document (${pageCount} pages).`);
      }
      pages.add(page);
      continue;
    }

    throw new Error(`Could not understand "${part}". Use formats like 1-3 or 5.`);
  }

  if (pages.size === 0) {
    throw new Error('No valid pages were selected.');
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Extract a subset of pages from a PDF into a brand-new document, entirely in
 * the browser. Page numbers are 1-based and are copied in the order provided.
 */
export async function extractPdfPages(
  file: File | Blob,
  pages: number[],
  options: SplitOptions = {},
): Promise<Uint8Array> {
  if (!pages || pages.length === 0) {
    throw new Error('No pages selected to extract.');
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

  const pageCount = source.getPageCount();
  const indices = pages.map((p) => {
    if (p < 1 || p > pageCount) {
      throw new Error(`Page ${p} is out of range (1-${pageCount}).`);
    }
    return p - 1;
  });

  const output = await PDFDocument.create();
  if (title) output.setTitle(title);
  if (author) output.setAuthor(author);
  output.setProducer('FluxConvert');
  output.setCreator('FluxConvert');

  const copied = await output.copyPages(source, indices);
  copied.forEach((page, i) => {
    output.addPage(page);
    if (onProgress) {
      onProgress(Math.round(((i + 1) / copied.length) * 100));
    }
  });

  return output.save();
}

/**
 * Split a PDF into one document per page. Returns an array of blobs in page
 * order, ready to be zipped or downloaded individually.
 */
export async function splitPdfIntoPages(
  file: File | Blob,
  options: SplitOptions = {},
): Promise<Blob[]> {
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

  const pageCount = source.getPageCount();
  const results: Blob[] = [];

  for (let i = 0; i < pageCount; i += 1) {
    const output = await PDFDocument.create();
    output.setProducer('FluxConvert');
    output.setCreator('FluxConvert');
    const [copied] = await output.copyPages(source, [i]);
    output.addPage(copied);
    const outBytes = await output.save();
    results.push(
      new Blob([toArrayBufferView(outBytes)], { type: 'application/pdf' }),
    );
    if (options.onProgress) {
      options.onProgress(Math.round(((i + 1) / pageCount) * 100));
    }
  }

  return results;
}

/**
 * Convenience helper that extracts pages and returns a downloadable Blob.
 */
export async function extractPdfPagesToBlob(
  file: File | Blob,
  pages: number[],
  options: SplitOptions = {},
): Promise<Blob> {
  const bytes = await extractPdfPages(file, pages, options);
  return new Blob([toArrayBufferView(bytes)], { type: 'application/pdf' });
}

/**
 * Trigger a browser download for a PDF blob without leaking object URLs.
 */
export function downloadBlob(blob: Blob, filename = 'document.pdf'): void {
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
