import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export type PageNumberPosition =
  | 'bottom-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'top-right'
  | 'top-left';

export type PageNumberFormat = 'n' | 'n-of-total' | 'page-n' | 'page-n-of-total';

export interface PageNumbersOptions {
  /** Position of the page number on each page. Defaults to bottom-center. */
  position?: PageNumberPosition;
  /** Format template for the number text. Defaults to 'n'. */
  format?: PageNumberFormat;
  /** Font size in points. Defaults to 11. */
  fontSize?: number;
  /** Distance from the page edge in points. Defaults to 28. */
  margin?: number;
  /** 1-based page numbers to stamp. Defaults to every page. */
  pages?: number[];
  /** Starting number for the first stamped page. Defaults to 1. */
  startAt?: number;
  /** Hex color string (e.g. "#111827"). Defaults to near-black. */
  color?: string;
  /** Optional document title to embed in the output PDF metadata. */
  title?: string;
  /** Optional author metadata. */
  author?: string;
  /** Called with a 0-100 progress value as pages are stamped. */
  onProgress?: (percent: number) => void;
  /** Optional AbortSignal to cancel a long-running operation. */
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

/** Parse a hex color string like "#1a2b3c" into an rgb() tuple. */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '').trim();
  const full =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return { r: 0.07, g: 0.09, b: 0.15 };
  }
  const num = Number.parseInt(full, 16);
  return {
    r: ((num >> 16) & 0xff) / 255,
    g: ((num >> 8) & 0xff) / 255,
    b: (num & 0xff) / 255,
  };
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

/** Build the display text for a given page number. */
function formatLabel(
  format: PageNumberFormat,
  current: number,
  total: number,
): string {
  switch (format) {
    case 'n-of-total':
      return `${current} / ${total}`;
    case 'page-n':
      return `Page ${current}`;
    case 'page-n-of-total':
      return `Page ${current} of ${total}`;
    case 'n':
    default:
      return `${current}`;
  }
}

/** Compute the x/y baseline coordinates for a given position. */
function computePosition(
  position: PageNumberPosition,
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  fontSize: number,
  margin: number,
): { x: number; y: number } {
  const isTop = position.startsWith('top');
  const y = isTop ? pageHeight - margin - fontSize : margin;

  if (position.endsWith('left')) {
    return { x: margin, y };
  }
  if (position.endsWith('right')) {
    return { x: pageWidth - margin - textWidth, y };
  }
  return { x: (pageWidth - textWidth) / 2, y };
}

/**
 * Stamp page numbers onto a PDF, entirely in the browser. Returns the new
 * PDF bytes. The original document is not modified.
 */
export async function addPageNumbers(
  file: File | Blob,
  options: PageNumbersOptions = {},
): Promise<Uint8Array> {
  const {
    position = 'bottom-center',
    format = 'n',
    fontSize = 11,
    margin = 28,
    pages,
    startAt = 1,
    color = '#111827',
    title,
    author,
    onProgress,
    signal,
  } = options;

  const bytes = new Uint8Array(await file.arrayBuffer());

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  } catch {
    const name = (file as File).name ?? 'the document';
    throw new Error(
      `Could not read "${name}". It may be corrupted or password-protected.`,
    );
  }

  const total = doc.getPageCount();
  const targets =
    pages && pages.length
      ? pages.filter((n) => n >= 1 && n <= total)
      : Array.from({ length: total }, (_, i) => i + 1);

  if (!targets.length) {
    throw new Error('No pages selected to number.');
  }

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const { r, g, b } = hexToRgb(color);
  const rgbColor = rgb(r, g, b);

  targets.forEach((pageNumber, index) => {
    if (signal?.aborted) {
      throw new Error('Operation was cancelled.');
    }

    const page = doc.getPage(pageNumber - 1);
    const { width, height } = page.getSize();
    const label = formatLabel(format, startAt + index, total);
    const textWidth = font.widthOfTextAtSize(label, fontSize);
    const { x, y } = computePosition(
      position,
      width,
      height,
      textWidth,
      fontSize,
      margin,
    );

    page.drawText(label, {
      x,
      y,
      size: fontSize,
      font,
      color: rgbColor,
    });

    if (onProgress) {
      onProgress(Math.round(((index + 1) / targets.length) * 100));
    }
  });

  if (title) doc.setTitle(title);
  if (author) doc.setAuthor(author);
  doc.setProducer('FluxConvert');
  doc.setCreator('FluxConvert');

  return doc.save();
}

/**
 * Convenience helper that stamps page numbers and returns a downloadable Blob.
 */
export async function addPageNumbersToBlob(
  file: File | Blob,
  options: PageNumbersOptions = {},
): Promise<Blob> {
  const bytes = await addPageNumbers(file, options);
  return new Blob([toArrayBufferView(bytes)], { type: 'application/pdf' });
}

/**
 * Trigger a browser download for a numbered PDF without leaking object URLs.
 */
export function downloadNumberedPdf(blob: Blob, filename = 'numbered.pdf'): void {
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
