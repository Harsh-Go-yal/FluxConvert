import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

export type WatermarkPosition =
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'tile';

export interface TextWatermarkOptions {
  /** The watermark text to stamp. */
  text: string;
  /** Placement of the watermark. Defaults to 'center'. */
  position?: WatermarkPosition;
  /** Font size in points. Defaults to 48. */
  fontSize?: number;
  /** Opacity between 0 and 1. Defaults to 0.15. */
  opacity?: number;
  /** Rotation in degrees. Defaults to 45. */
  rotation?: number;
  /** Hex color string (e.g. "#ef4444"). Defaults to a soft red. */
  color?: string;
  /** 1-based page numbers to stamp. Defaults to every page. */
  pages?: number[];
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
    return { r: 0.94, g: 0.27, b: 0.27 };
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

/** Compute the x/y baseline coordinates for a given position. */
function computePosition(
  position: WatermarkPosition,
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  textHeight: number,
  margin: number,
): { x: number; y: number } {
  switch (position) {
    case 'top-left':
      return { x: margin, y: pageHeight - margin - textHeight };
    case 'top-right':
      return { x: pageWidth - margin - textWidth, y: pageHeight - margin - textHeight };
    case 'bottom-left':
      return { x: margin, y: margin };
    case 'bottom-right':
      return { x: pageWidth - margin - textWidth, y: margin };
    case 'center':
    case 'tile':
    default:
      return {
        x: (pageWidth - textWidth) / 2,
        y: (pageHeight - textHeight) / 2,
      };
  }
}

/**
 * Stamp a text watermark onto a PDF, entirely in the browser. Returns the new
 * PDF bytes. The original document is not modified.
 */
export async function addTextWatermark(
  file: File | Blob,
  options: TextWatermarkOptions,
): Promise<Uint8Array> {
  const {
    text,
    position = 'center',
    fontSize = 48,
    opacity = 0.15,
    rotation = 45,
    color = '#ef4444',
    pages,
    title,
    author,
    onProgress,
    signal,
  } = options;

  if (!text.trim()) {
    throw new Error('Enter some watermark text.');
  }

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
    throw new Error('No pages selected to watermark.');
  }

  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const { r, g, b } = hexToRgb(color);
  const rgbColor = rgb(r, g, b);
  const clampedOpacity = Math.max(0, Math.min(1, opacity));
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const textHeight = font.heightAtSize(fontSize);
  const margin = 36;

  targets.forEach((pageNumber, index) => {
    if (signal?.aborted) {
      throw new Error('Operation was cancelled.');
    }

    const page = doc.getPage(pageNumber - 1);
    const { width, height } = page.getSize();

    if (position === 'tile') {
      const stepX = textWidth + 80;
      const stepY = textHeight + 120;
      for (let y = -textHeight; y < height + stepY; y += stepY) {
        for (let x = -textWidth; x < width + stepX; x += stepX) {
          page.drawText(text, {
            x,
            y,
            size: fontSize,
            font,
            color: rgbColor,
            opacity: clampedOpacity,
            rotate: degrees(rotation),
          });
        }
      }
    } else {
      const { x, y } = computePosition(
        position,
        width,
        height,
        textWidth,
        textHeight,
        margin,
      );
      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgbColor,
        opacity: clampedOpacity,
        rotate: degrees(rotation),
      });
    }

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
 * Convenience helper that watermarks a PDF and returns a downloadable Blob.
 */
export async function addTextWatermarkToBlob(
  file: File | Blob,
  options: TextWatermarkOptions,
): Promise<Blob> {
  const bytes = await addTextWatermark(file, options);
  return new Blob([toArrayBufferView(bytes)], { type: 'application/pdf' });
}

/**
 * Trigger a browser download for a watermarked PDF without leaking object URLs.
 */
export function downloadWatermarkedPdf(
  blob: Blob,
  filename = 'watermarked.pdf',
): void {
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
