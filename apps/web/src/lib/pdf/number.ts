import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export type NumberPosition =
  | 'bottom-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'top-right'
  | 'top-left';

export interface NumberOptions {
  /** Where on each page the number should appear. */
  position?: NumberPosition;
  /** Font size in points. */
  fontSize?: number;
  /** Margin from the page edge in points. */
  margin?: number;
  /** Starting page number (defaults to 1). */
  startAt?: number;
  /** Optional custom formatter, e.g. (n, total) => `Page ${n} of ${total}`. */
  format?: (page: number, total: number) => string;
  /** Optional progress callback (0-1). */
  onProgress?: (progress: number) => void;
}

export interface NumberResult {
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

function resolveXY(
  position: NumberPosition,
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  fontSize: number,
  margin: number,
): { x: number; y: number } {
  const [vertical, horizontal] = position.split('-') as [
    'top' | 'bottom',
    'left' | 'center' | 'right',
  ];

  let x: number;
  if (horizontal === 'left') x = margin;
  else if (horizontal === 'right') x = pageWidth - margin - textWidth;
  else x = (pageWidth - textWidth) / 2;

  const y =
    vertical === 'top'
      ? pageHeight - margin - fontSize
      : margin;

  return { x, y };
}

/**
 * Stamp page numbers onto every page of a PDF entirely in the browser.
 * Uses a standard Helvetica font so no external font embedding is required.
 */
export async function numberPdfPages(
  source: File | Blob | ArrayBuffer | Uint8Array,
  options: NumberOptions = {},
): Promise<NumberResult> {
  const {
    position = 'bottom-center',
    fontSize = 11,
    margin = 24,
    startAt = 1,
    format,
    onProgress,
  } = options;

  onProgress?.(0.05);
  const doc = await loadDocument(source);
  onProgress?.(0.25);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const total = pages.length;

  pages.forEach((page, index) => {
    const pageNumber = startAt + index;
    const label = format
      ? format(pageNumber, total)
      : `${pageNumber}`;
    const textWidth = font.widthOfTextAtSize(label, fontSize);
    const { width, height } = page.getSize();
    const { x, y } = resolveXY(position, width, height, textWidth, fontSize, margin);

    page.drawText(label, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.15, 0.15, 0.2),
    });
  });

  onProgress?.(0.85);
  const bytes = await doc.save({ useObjectStreams: true });
  onProgress?.(1);

  const name =
    typeof File !== 'undefined' && source instanceof File
      ? `${baseName(source.name)}-numbered.pdf`
      : 'numbered.pdf';

  return { bytes, pageCount: total, name };
}
