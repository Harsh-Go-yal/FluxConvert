import { PDFDocument } from 'pdf-lib';

/** Margins to trim from each edge. */
export interface CropMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CropOptions {
  /** Margin unit. 'percent' is relative to each page's own size. */
  unit?: 'percent' | 'mm' | 'pt';
  /** Only crop these zero-based page indices. Defaults to every page. */
  pages?: number[];
  onProgress?: (progress: number) => void;
}

export interface CropResult {
  bytes: Uint8Array;
  pageCount: number;
}

const MM_TO_PT = 72 / 25.4;

async function loadDocument(
  source: File | Blob | ArrayBuffer | Uint8Array,
): Promise<PDFDocument> {
  const data =
    source instanceof Uint8Array || source instanceof ArrayBuffer
      ? source
      : await (source as Blob).arrayBuffer();
  return PDFDocument.load(data, { ignoreEncryption: true });
}

/**
 * Crop pages by trimming margins.
 *
 * Both the CropBox and MediaBox are set: viewers honour CropBox for display,
 * but some printers and converters only read MediaBox, so setting one alone
 * produces a file that looks cropped on screen and uncropped on paper.
 */
export async function cropPdf(
  source: File | Blob | ArrayBuffer | Uint8Array,
  margins: CropMargins,
  options: CropOptions = {},
): Promise<CropResult> {
  const { unit = 'percent', pages: pageFilter, onProgress } = options;

  onProgress?.(0.05);
  const doc = await loadDocument(source);
  const pages = doc.getPages();
  const selected = new Set(pageFilter ?? pages.map((_, i) => i));

  pages.forEach((page, index) => {
    if (!selected.has(index)) return;

    const { width, height } = page.getSize();
    const toPoints = (value: number, span: number) => {
      if (!Number.isFinite(value) || value <= 0) return 0;
      if (unit === 'percent') return (Math.min(value, 45) / 100) * span;
      if (unit === 'mm') return value * MM_TO_PT;
      return value;
    };

    const left = toPoints(margins.left, width);
    const right = toPoints(margins.right, width);
    const top = toPoints(margins.top, height);
    const bottom = toPoints(margins.bottom, height);

    const newWidth = width - left - right;
    const newHeight = height - top - bottom;
    if (newWidth <= 1 || newHeight <= 1) {
      throw new Error('Those margins would remove the whole page. Use smaller values.');
    }

    // PDF coordinates start at the bottom-left corner.
    const box = page.getCropBox();
    const originX = box.x + left;
    const originY = box.y + bottom;

    page.setCropBox(originX, originY, newWidth, newHeight);
    page.setMediaBox(originX, originY, newWidth, newHeight);
    onProgress?.(0.1 + (0.85 * (index + 1)) / pages.length);
  });

  const bytes = await doc.save();
  onProgress?.(1);
  return { bytes, pageCount: pages.length };
}
