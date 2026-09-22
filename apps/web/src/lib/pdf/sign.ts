import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Stamp a signature (drawn, typed or uploaded) onto a PDF page.
 *
 * This is a visible signature, not a cryptographic one — it does not certify
 * the document. The UI says so; do not describe it as a digital signature.
 */

export interface SignaturePlacement {
  /** Zero-based page index to sign. */
  page: number;
  /** Position as a fraction (0-1) of the page, measured from the top-left. */
  x: number;
  y: number;
  /** Width as a fraction (0-1) of the page width. Height follows the aspect ratio. */
  width: number;
}

export interface SignImageOptions {
  type: 'image';
  /** PNG bytes, typically exported from a signature canvas. */
  image: Uint8Array | ArrayBuffer | Blob;
}

export interface SignTextOptions {
  type: 'text';
  text: string;
  /** A script-like feel is not available in standard PDF fonts; italic is the closest. */
  font?: 'Helvetica' | 'Times-Italic' | 'Courier';
  color?: { r: number; g: number; b: number };
}

export type SignOptions = (SignImageOptions | SignTextOptions) & {
  placement: SignaturePlacement;
  /** Optional date line printed under the signature. */
  dateLabel?: string;
};

export interface SignResult {
  bytes: Uint8Array;
  pageCount: number;
}

async function toBytes(source: Uint8Array | ArrayBuffer | Blob): Promise<Uint8Array> {
  if (source instanceof Uint8Array) return source;
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  return new Uint8Array(await source.arrayBuffer());
}

export async function signPdf(
  source: File | Blob | ArrayBuffer | Uint8Array,
  options: SignOptions,
): Promise<SignResult> {
  const data =
    source instanceof Uint8Array || source instanceof ArrayBuffer
      ? source
      : await (source as Blob).arrayBuffer();
  const doc = await PDFDocument.load(data, { ignoreEncryption: true });
  const pages = doc.getPages();

  const { placement, dateLabel } = options;
  const index = Math.min(Math.max(0, placement.page), pages.length - 1);
  const page = pages[index];
  const { width: pageWidth, height: pageHeight } = page.getSize();

  const targetWidth = Math.max(40, Math.min(placement.width, 1) * pageWidth);
  const left = Math.min(Math.max(placement.x, 0), 1) * pageWidth;
  // Placement arrives in screen coordinates (top-left origin); PDF counts from the bottom.
  const topOffset = Math.min(Math.max(placement.y, 0), 1) * pageHeight;

  let drawnHeight: number;

  if (options.type === 'image') {
    const bytes = await toBytes(options.image);
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
    const image = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const ratio = image.height / image.width;
    drawnHeight = targetWidth * ratio;
    page.drawImage(image, {
      x: left,
      y: pageHeight - topOffset - drawnHeight,
      width: targetWidth,
      height: drawnHeight,
    });
  } else {
    const label = options.text.trim();
    if (!label) throw new Error('Enter the name to sign with.');
    const font = await doc.embedFont(
      options.font === 'Times-Italic'
        ? StandardFonts.TimesRomanItalic
        : options.font === 'Courier'
          ? StandardFonts.Courier
          : StandardFonts.Helvetica,
    );
    // Pick the size that makes the text fill the requested width.
    const baseWidth = font.widthOfTextAtSize(label, 100) / 100;
    const size = Math.max(10, Math.min(72, targetWidth / Math.max(baseWidth, 0.01)));
    drawnHeight = font.heightAtSize(size);
    const color = options.color ?? { r: 0.05, g: 0.1, b: 0.4 };
    page.drawText(label, {
      x: left,
      y: pageHeight - topOffset - drawnHeight,
      size,
      font,
      color: rgb(color.r, color.g, color.b),
    });
  }

  if (dateLabel) {
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText(dateLabel, {
      x: left,
      y: pageHeight - topOffset - drawnHeight - 14,
      size: 9,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
  }

  return { bytes: await doc.save(), pageCount: pages.length };
}
