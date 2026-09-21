import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

export type ImageFormat = 'png' | 'jpeg' | 'webp';

export interface PdfToImageOptions {
  /** Output image format. Defaults to 'png'. */
  format?: ImageFormat;
  /** Render scale relative to the PDF's native size (1 = 72 DPI). Defaults to 2. */
  scale?: number;
  /** JPEG/WebP quality between 0 and 1. Ignored for PNG. Defaults to 0.92. */
  quality?: number;
  /** Only render these 1-based page numbers. Defaults to all pages. */
  pages?: number[];
  /** Called with a 0-100 progress value as pages are rendered. */
  onProgress?: (percent: number, pageNumber: number, total: number) => void;
  /** Optional AbortSignal to cancel a long-running render. */
  signal?: AbortSignal;
}

export interface RenderedPage {
  /** 1-based page number. */
  pageNumber: number;
  /** Rendered image blob. */
  blob: Blob;
  /** Suggested filename for the rendered page. */
  filename: string;
  /** Rendered width in pixels. */
  width: number;
  /** Rendered height in pixels. */
  height: number;
}

const MIME_BY_FORMAT: Record<ImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

const EXT_BY_FORMAT: Record<ImageFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
};

/**
 * Lazily load pdf.js and configure its worker. We import the worker as a URL
 * so bundlers (Next.js/webpack) emit it as a static asset.
 */
async function loadPdfJs() {
  const pdfjs = await import('pdfjs-dist');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
  }
  return pdfjs;
}

/**
 * Render a single PDF page to a canvas and return it as a Blob.
 */
async function renderPageToBlob(
  page: PDFPageProxy,
  format: ImageFormat,
  scale: number,
  quality: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not create a 2D canvas context for rendering.');
  }

  // Fill white background so JPEG/WebP don't render transparent PDFs as black.
  if (format !== 'png') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  await page.render({ canvasContext: context, viewport, canvas }).promise;

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, MIME_BY_FORMAT[format], quality);
  });

  if (!blob) {
    throw new Error('Failed to encode the rendered page as an image.');
  }

  return { blob, width: canvas.width, height: canvas.height };
}

/**
 * Convert a PDF into a list of rendered image blobs, entirely in the browser.
 * Returns one entry per rendered page.
 */
export async function pdfToImages(
  file: File | Blob,
  options: PdfToImageOptions = {},
): Promise<RenderedPage[]> {
  const {
    format = 'png',
    scale = 2,
    quality = 0.92,
    pages: pageFilter,
    onProgress,
    signal,
  } = options;

  if (scale <= 0 || scale > 8) {
    throw new Error('Scale must be between 0 and 8.');
  }
  if (quality <= 0 || quality > 1) {
    throw new Error('Quality must be between 0 and 1.');
  }

  const pdfjs = await loadPdfJs();
  const bytes = new Uint8Array(await file.arrayBuffer());

  let doc: PDFDocumentProxy;
  try {
    doc = await pdfjs.getDocument({ data: bytes }).promise;
  } catch {
    const name = (file as File).name ?? 'the document';
    throw new Error(
      `Could not read "${name}". It may be corrupted or password-protected.`,
    );
  }

  const total = doc.numPages;
  const targets = pageFilter && pageFilter.length
    ? pageFilter.filter((n) => n >= 1 && n <= total)
    : Array.from({ length: total }, (_, i) => i + 1);

  const baseName = ((file as File).name ?? 'document').replace(/\.[^.]+$/, '');
  const results: RenderedPage[] = [];

  try {
    for (let i = 0; i < targets.length; i++) {
      if (signal?.aborted) {
        throw new Error('Rendering was cancelled.');
      }
      const pageNumber = targets[i];
      const page = await doc.getPage(pageNumber);
      const { blob, width, height } = await renderPageToBlob(
        page,
        format,
        scale,
        quality,
      );
      results.push({
        pageNumber,
        blob,
        width,
        height,
        filename: `${baseName}-page-${String(pageNumber).padStart(3, '0')}.${EXT_BY_FORMAT[format]}`,
      });
      page.cleanup();
      if (onProgress) {
        onProgress(
          Math.round(((i + 1) / targets.length) * 100),
          pageNumber,
          total,
        );
      }
    }
  } finally {
    await doc.destroy();
  }

  return results;
}

/**
 * Trigger a browser download for a Blob without leaking object URLs.
 */
export function downloadBlob(blob: Blob, filename: string): void {
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
