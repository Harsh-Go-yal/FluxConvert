import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

export type PageNumberPosition =
  | 'bottom-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'top-right'
  | 'top-left';

export type PageNumberFormat =
  | 'n'
  | 'n-of-total'
  | 'page-n'
  | 'page-n-of-total';

export interface PageNumberOptions {
  /** Where to place the number on each page. */
  position?: PageNumberPosition;
  /** Format template for the number. */
  format?: PageNumberFormat;
  /** First number to print (defaults to 1). */
  startNumber?: number;
  /** Font size in points. */
  fontSize?: number;
  /** Margin from the page edge in points. */
  margin?: number;
  /** Text color as an [r, g, b] tuple with values between 0 and 1. */
  color?: [number, number, number];
  /** Optional prefix/suffix applied to every number. */
  prefix?: string;
  suffix?: string;
  /** Only number these 0-based page indices. Defaults to all pages. */
  pages?: number[];
  /** Progress callback with a value between 0 and 1. */
  onProgress?: (progress: number) => void;
}

export interface PageNumberResult {
  bytes: Uint8Array;
  pageCount: number;
  numberedPages: number;
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

function formatLabel(
  format: PageNumberFormat,
  n: number,
  total: number,
): string {
  switch (format) {
    case 'n-of-total':
      return `${n} / ${total}`;
    case 'page-n':
      return `Page ${n}`;
    case 'page-n-of-total':
      return `Page ${n} of ${total}`;
    case 'n':
    default:
      return `${n}`;
  }
}

function computePosition(
  position: PageNumberPosition,
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  fontSize: number,
  margin: number,
): { x: number; y: number } {
  const isTop = position.startsWith('top');
  const isLeft = position.endsWith('left');
  const isRight = position.endsWith('right');

  let x: number;
  if (isLeft) x = margin;
  else if (isRight) x = pageWidth - margin - textWidth;
  else x = (pageWidth - textWidth) / 2;

  const y = isTop ? pageHeight - margin - fontSize : margin;

  return { x, y };
}

/**
 * Add page numbers to a PDF entirely in the browser using pdf-lib.
 * Supports multiple positions, formats, and a custom start number.
 */
export async function addPageNumbers(
  source: File | Blob | ArrayBuffer | Uint8Array,
  options: PageNumberOptions = {},
): Promise<PageNumberResult> {
  const {
    position = 'bottom-center',
    format = 'n',
    startNumber = 1,
    fontSize = 12,
    margin = 24,
    color = [0.1, 0.1, 0.1],
    prefix = '',
    suffix = '',
    pages,
    onProgress,
  } = options;

  onProgress?.(0.05);
  const doc = await loadDocument(source);
  onProgress?.(0.2);

  const font: PDFFont = await doc.embedFont(StandardFonts.Helvetica);
  onProgress?.(0.35);

  const allPages = doc.getPages();
  const total = allPages.length;
  const targetIndices =
    pages && pages.length > 0
      ? pages.filter((i) => i >= 0 && i < total)
      : allPages.map((_, i) => i);

  const rgbColor = rgb(color[0], color[1], color[2]);

  targetIndices.forEach((pageIndex, i) => {
    const page: PDFPage = allPages[pageIndex];
    const { width, height } = page.getSize();
    const label = `${prefix}${formatLabel(format, startNumber + i, total)}${suffix}`;
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

    const step = 0.35 + ((i + 1) / targetIndices.length) * 0.55;
    onProgress?.(Math.min(0.95, step));
  });

  const bytes = await doc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });
  onProgress?.(1);

  return {
    bytes,
    pageCount: total,
    numberedPages: targetIndices.length,
  };
}

export { PDFDocument };
