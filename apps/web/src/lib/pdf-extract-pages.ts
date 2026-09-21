import { PDFDocument } from 'pdf-lib';

export interface ExtractPagesOptions {
  /** 1-based page numbers to keep, in the order they should appear. */
  pages: number[];
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
 * Parse a page-range string like "1-3, 5, 8-10" into a sorted, de-duplicated
 * list of 1-based page numbers. Throws on malformed input.
 */
export function parsePageRanges(input: string, maxPage?: number): number[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const result = new Set<number>();
  const parts = trimmed.split(',');

  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;

    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number.parseInt(rangeMatch[1], 10);
      const end = Number.parseInt(rangeMatch[2], 10);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end < 1) {
        throw new Error(`Invalid page range: "${part}".`);
      }
      const lo = Math.min(start, end);
      const hi = Math.max(start, end);
      for (let i = lo; i <= hi; i++) {
        if (maxPage === undefined || i <= maxPage) result.add(i);
      }
      continue;
    }

    const single = Number.parseInt(part, 10);
    if (!Number.isFinite(single) || single < 1) {
      throw new Error(`Invalid page number: "${part}".`);
    }
    if (maxPage === undefined || single <= maxPage) result.add(single);
  }

  return Array.from(result).sort((a, b) => a - b);
}

/**
 * Extract a subset of pages from a PDF, entirely in the browser. The output
 * preserves the order of the provided page numbers.
 */
export async function extractPages(
  file: File | Blob,
  options: ExtractPagesOptions,
): Promise<Uint8Array> {
  const { pages, title, author, onProgress } = options;

  if (!pages.length) {
    throw new Error('Select at least one page to extract.');
  }

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

  const total = source.getPageCount();
  const valid = pages.filter((n) => n >= 1 && n <= total);
  if (!valid.length) {
    throw new Error(`No valid pages selected (document has ${total} pages).`);
  }

  const output = await PDFDocument.create();
  if (title) output.setTitle(title);
  if (author) output.setAuthor(author);
  output.setProducer('FluxConvert');
  output.setCreator('FluxConvert');

  // pdf-lib uses 0-based indices for copyPages.
  const indices = valid.map((n) => n - 1);
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
 * Remove a subset of pages from a PDF, entirely in the browser. At least one
 * page must remain in the output.
 */
export async function removePages(
  file: File | Blob,
  options: ExtractPagesOptions,
): Promise<Uint8Array> {
  const { pages, title, author, onProgress } = options;

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

  const total = source.getPageCount();
  const toRemove = new Set(pages.filter((n) => n >= 1 && n <= total));
  const keep = Array.from({ length: total }, (_, i) => i + 1).filter(
    (n) => !toRemove.has(n),
  );

  if (!keep.length) {
    throw new Error('You cannot remove every page from the document.');
  }

  const output = await PDFDocument.create();
  if (title) output.setTitle(title);
  if (author) output.setAuthor(author);
  output.setProducer('FluxConvert');
  output.setCreator('FluxConvert');

  const indices = keep.map((n) => n - 1);
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
 * Convenience helper that extracts pages and returns a downloadable Blob.
 */
export async function extractPagesToBlob(
  file: File | Blob,
  options: ExtractPagesOptions,
): Promise<Blob> {
  const bytes = await extractPages(file, options);
  return new Blob([toArrayBufferView(bytes)], { type: 'application/pdf' });
}

/**
 * Trigger a browser download for a PDF blob without leaking object URLs.
 */
export function downloadPdf(blob: Blob, filename = 'extracted.pdf'): void {
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
