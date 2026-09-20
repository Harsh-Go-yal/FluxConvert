import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFImage } from 'pdf-lib';

export type WatermarkPosition =
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'tile';

export interface WatermarkTextOptions {
  type: 'text';
  text: string;
  fontSize?: number;
  color?: { r: number; g: number; b: number };
  opacity?: number;
  rotation?: number;
  position?: WatermarkPosition;
  font?: 'Helvetica' | 'Helvetica-Bold' | 'Times-Roman' | 'Courier';
}

export interface WatermarkImageOptions {
  type: 'image';
  image: File | Blob | ArrayBuffer | Uint8Array;
  /** Width as a fraction of the page width (0-1). */
  scale?: number;
  opacity?: number;
  rotation?: number;
  position?: WatermarkPosition;
}

export type WatermarkOptions = (WatermarkTextOptions | WatermarkImageOptions) & {
  /** Optional 1-based page numbers to apply the watermark to. Defaults to all pages. */
  pages?: number[];
  onProgress?: (progress: number) => void;
};

export interface WatermarkResult {
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

function resolveFontName(name: WatermarkTextOptions['font']): StandardFonts {
  switch (name) {
    case 'Helvetica-Bold':
      return StandardFonts.HelveticaBold;
    case 'Times-Roman':
      return StandardFonts.TimesRoman;
    case 'Courier':
      return StandardFonts.Courier;
    default:
      return StandardFonts.Helvetica;
  }
}

async function embedImage(
  doc: PDFDocument,
  source: File | Blob | ArrayBuffer | Uint8Array,
): Promise<PDFImage> {
  let bytes: ArrayBuffer | Uint8Array;
  if (source instanceof Uint8Array) bytes = source;
  else if (source instanceof ArrayBuffer) bytes = source;
  else bytes = await (source as Blob).arrayBuffer();

  const name = typeof File !== 'undefined' && source instanceof File ? source.name : '';
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return doc.embedPng(bytes);
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return doc.embedJpg(bytes);

  // Fallback: sniff magic bytes.
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const isPng =
    view.length > 8 &&
    view[0] === 0x89 &&
    view[1] === 0x50 &&
    view[2] === 0x4e &&
    view[3] === 0x47;
  return isPng ? doc.embedPng(bytes) : doc.embedJpg(bytes);
}

interface Placement {
  x: number;
  y: number;
}

function computePlacement(
  position: WatermarkPosition,
  pageWidth: number,
  pageHeight: number,
  itemWidth: number,
  itemHeight: number,
  margin = 24,
): Placement {
  switch (position) {
    case 'top-left':
      return { x: margin, y: pageHeight - itemHeight - margin };
    case 'top-right':
      return { x: pageWidth - itemWidth - margin, y: pageHeight - itemHeight - margin };
    case 'bottom-left':
      return { x: margin, y: margin };
    case 'bottom-right':
      return { x: pageWidth - itemWidth - margin, y: margin };
    case 'center':
    default:
      return {
        x: (pageWidth - itemWidth) / 2,
        y: (pageHeight - itemHeight) / 2,
      };
  }
}

/**
 * Apply a text or image watermark to a PDF entirely in the browser.
 * Supports center/edge placement or a tiled diagonal pattern.
 */
export async function watermarkPdf(
  source: File | Blob | ArrayBuffer | Uint8Array,
  options: WatermarkOptions,
): Promise<WatermarkResult> {
  const { onProgress, pages: pageFilter } = options;
  const opacity = Math.min(1, Math.max(0, options.opacity ?? 0.25));
  const rotation = options.rotation ?? (options.position === 'tile' ? 45 : 0);
  const position: WatermarkPosition = options.position ?? 'center';

  onProgress?.(0.05);
  const doc = await loadDocument(source);
  onProgress?.(0.2);

  let font: PDFFont | undefined;
  let image: PDFImage | undefined;
  let textWidth = 0;
  let textHeight = 0;
  let fontSize = 48;

  if (options.type === 'text') {
    font = await doc.embedFont(resolveFontName(options.font));
    fontSize = options.fontSize ?? 48;
    textWidth = font.widthOfTextAtSize(options.text, fontSize);
    textHeight = font.heightAtSize(fontSize);
  } else {
    image = await embedImage(doc, options.image);
  }

  onProgress?.(0.35);

  const allPages = doc.getPages();
  const targetSet = pageFilter && pageFilter.length ? new Set(pageFilter) : null;
  const targets = allPages.filter((_, i) => !targetSet || targetSet.has(i + 1));
  const total = targets.length || 1;

  const color = options.type === 'text' ? options.color : undefined;
  const rgbColor = color
    ? rgb(color.r, color.g, color.b)
    : rgb(0.85, 0.1, 0.1);

  targets.forEach((page, index) => {
    const { width: pageWidth, height: pageHeight } = page.getSize();

    if (options.type === 'text' && font) {
      if (position === 'tile') {
        const stepX = Math.max(textWidth + 80, 160);
        const stepY = Math.max(textHeight + 80, 120);
        for (let y = -pageHeight; y < pageHeight * 2; y += stepY) {
          for (let x = -pageWidth; x < pageWidth * 2; x += stepX) {
            page.drawText(options.text, {
              x,
              y,
              size: fontSize,
              font,
              color: rgbColor,
              opacity,
              rotate: degrees(rotation),
            });
          }
        }
      } else {
        const { x, y } = computePlacement(
          position,
          pageWidth,
          pageHeight,
          textWidth,
          textHeight,
        );
        page.drawText(options.text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgbColor,
          opacity,
          rotate: degrees(rotation),
        });
      }
    } else if (options.type === 'image' && image) {
      const scale = Math.min(1, Math.max(0.05, options.scale ?? 0.35));
      const drawWidth = pageWidth * scale;
      const drawHeight = (image.height / image.width) * drawWidth;

      if (position === 'tile') {
        const stepX = drawWidth + 60;
        const stepY = drawHeight + 60;
        for (let y = -pageHeight; y < pageHeight * 2; y += stepY) {
          for (let x = -pageWidth; x < pageWidth * 2; x += stepX) {
            page.drawImage(image, {
              x,
              y,
              width: drawWidth,
              height: drawHeight,
              opacity,
              rotate: degrees(rotation),
            });
          }
        }
      } else {
        const { x, y } = computePlacement(
          position,
          pageWidth,
          pageHeight,
          drawWidth,
          drawHeight,
        );
        page.drawImage(image, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
          opacity,
          rotate: degrees(rotation),
        });
      }
    }

    onProgress?.(0.35 + ((index + 1) / total) * 0.55);
  });

  const bytes = await doc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });

  onProgress?.(1);

  const sourceName =
    typeof File !== 'undefined' && source instanceof File ? source.name : 'document.pdf';

  return {
    bytes,
    pageCount: allPages.length,
    name: `${baseName(sourceName)}-watermarked.pdf`,
  };
}

export { PDFDocument, StandardFonts, rgb, degrees };
