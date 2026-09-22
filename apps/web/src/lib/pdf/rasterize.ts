import { PDFDocument } from 'pdf-lib';

/**
 * Render PDF pages to bitmaps and rebuild the document from those images.
 *
 * This is the honest way to do redaction and flattening in the browser: once a
 * page is an image, anything painted over it is genuinely gone — text under a
 * black box can no longer be selected, copied or recovered from the file.
 *
 * The trade-off is that the output has no selectable text, so only use it where
 * that is the point (redaction, archiving, slide export).
 */

export interface PageBox {
  /** Zero-based page index the box belongs to. */
  page: number;
  /** Position and size as fractions (0-1) of the rendered page. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RasterizeOptions {
  /** Pixels per PDF point. 2 ≈ 144 DPI, enough for text to stay readable. */
  scale?: number;
  /** Boxes to paint before the page is captured (used for redaction). */
  boxes?: PageBox[];
  /** Fill colour for those boxes. */
  boxColor?: string;
  /** Output image type for each page. */
  format?: 'image/jpeg' | 'image/png';
  quality?: number;
  onProgress?: (percent: number, page: number, total: number) => void;
}

export interface RasterPage {
  pageNumber: number;
  blob: Blob;
  width: number;
  height: number;
}

async function loadPdfJs() {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  return pdfjs;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not capture the rendered page.'))),
      type,
      quality,
    );
  });
}

/** Render each page to an image blob, optionally painting boxes over it first. */
export async function rasterizePages(
  source: File | Blob,
  options: RasterizeOptions = {},
): Promise<RasterPage[]> {
  const {
    scale = 2,
    boxes = [],
    boxColor = '#000000',
    format = 'image/jpeg',
    quality = 0.9,
    onProgress,
  } = options;

  if (typeof document === 'undefined') {
    throw new Error('This tool only runs in the browser.');
  }

  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await source.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const doc = await loadingTask.promise;
  const out: RasterPage[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not create a drawing surface.');

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      // pdfjs requires the canvas element itself, not just the 2D context.
      await page.render({ canvas, canvasContext: context, viewport }).promise;

      const pageBoxes = boxes.filter((b) => b.page === pageNumber - 1);
      if (pageBoxes.length) {
        context.fillStyle = boxColor;
        for (const box of pageBoxes) {
          context.fillRect(
            box.x * canvas.width,
            box.y * canvas.height,
            box.width * canvas.width,
            box.height * canvas.height,
          );
        }
      }

      out.push({
        pageNumber,
        blob: await canvasToBlob(canvas, format, quality),
        width: canvas.width,
        height: canvas.height,
      });
      page.cleanup();
      onProgress?.(Math.round((pageNumber / doc.numPages) * 100), pageNumber, doc.numPages);
    }
  } finally {
    await loadingTask.destroy();
  }
  return out;
}

/** Rebuild a PDF whose pages are the given images, preserving page dimensions. */
export async function pdfFromImages(
  pages: RasterPage[],
  pointScale = 2,
): Promise<Uint8Array> {
  if (!pages.length) throw new Error('There are no pages to write.');
  const doc = await PDFDocument.create();

  for (const item of pages) {
    const bytes = new Uint8Array(await item.blob.arrayBuffer());
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
    const image = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const width = item.width / pointScale;
    const height = item.height / pointScale;
    const page = doc.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
  }
  return doc.save();
}

/**
 * Flatten a PDF: every page becomes an image, so annotations, form fields and
 * hidden layers are baked in and can no longer be edited or extracted.
 */
export async function flattenPdf(
  source: File | Blob,
  options: RasterizeOptions = {},
): Promise<Uint8Array> {
  const scale = options.scale ?? 2;
  const pages = await rasterizePages(source, { ...options, scale });
  return pdfFromImages(pages, scale);
}
