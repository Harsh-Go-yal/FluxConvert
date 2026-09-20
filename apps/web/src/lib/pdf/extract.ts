import { PDFDocument } from 'pdf-lib';

export interface ExtractOptions {
  /** 1-based page numbers to extract, in the order they should appear. */
  pages: number[];
  /** Optional progress callback (0-1). */
  onProgress?: (progress: number) => void;
}

export interface ExtractResult {
  bytes: Uint8Array;
  pageCount: number;
  name: string;
}

async function loadDocument(
  source: File | Blob | ArrayBuffer | Uint8Array,
): Promise<PDFDocument> {
  let data: ArrayBuffer | Uint8Array;
  if (source instanceof Uint8Array) data = source;
  else if (source instanceof ArrayBuffer) data = source;
  else data = await (source as Blob).arrayBuffer();
  return PDFDocument.load(data, { ignoreEncryption: true, updateMetadata: false });
}

function baseName(name: string): string {
  return name.replace(/\.[^./\\]+$/, '') || 'document';
}

/**
 * Parse a human page-range string like "1-3, 5, 8-10" into a sorted,
 * de-duplicated array of 1-based page numbers. Invalid tokens are skipped.
 */
export function parsePageRanges(input: string, maxPage?: number): number[] {
  if (!input) return [];
  const result = new Set<number>();
  const tokens = input.split(/[,\s]+/).filter(Boolean);
  for (const token of tokens) {
    const rangeMatch = token.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      const lo = Math.max(1, Math.min(start, end));
      const hi = Math.max(start, end);
      for (let i = lo; i <= hi; i += 1) {
        if (maxPage && i > maxPage) break;
        result.add(i);
      }
      continue;
    }
    const single = parseInt(token, 10);
    if (Number.isFinite(single) && single >= 1) {
      if (!maxPage || single <= maxPage) result.add(single);
    }
  }
  return Array.from(result).sort((a, b) => a - b);
}

/**
 * Extract a subset of pages from a PDF entirely in the browser.
 * Pages are copied in the order provided, so callers can also use this
 * to reorder pages by passing a custom sequence.
 */
export async function extractPdfPages(
  source: File | Blob | ArrayBuffer | Uint8Array,
  options: ExtractOptions,
): Promise<ExtractResult> {
  const { pages, onProgress } = options;
  if (!pages.length) {
    throw new Error('No pages selected for extraction.');
  }

  onProgress?.(0.05);
  const src = await loadDocument(source);
  onProgress?.(0.25);

  const total = src.getPageCount();
  const valid = pages.filter((p) => p >= 1 && p <= total);
  if (!valid.length) {
    throw new Error('Selected pages are outside the document range.');
  }

  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, valid.map((p) => p - 1));
  copied.forEach((page) => out.addPage(page));
  onProgress?.(0.85);

  const bytes = await out.save({ useObjectStreams: true });
  onProgress?.(1);

  const name =
    typeof File !== 'undefined' && source instanceof File
      ? `${baseName(source.name)}-extracted.pdf`
      : 'extracted.pdf';

  return { bytes, pageCount: valid.length, name };
}
