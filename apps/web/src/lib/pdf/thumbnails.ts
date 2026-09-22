import type { PDFDocumentProxy } from 'pdfjs-dist';

export interface ThumbnailOptions {
  /** Target width in CSS pixels for each rendered page. */
  width?: number;
  /** Device pixel ratio multiplier for crisp rendering. */
  scale?: number;
  /** Optional subset of zero-based page indices to render. */
  pages?: number[];
  /** Called after each page finishes rendering. */
  onProgress?: (rendered: number, total: number) => void;
}

export interface PageThumbnail {
  /** Zero-based page index. */
  index: number;
  /** 1-based page number for display. */
  pageNumber: number;
  /** Data URL of the rendered page. */
  dataUrl: string;
  /** Rendered width in CSS pixels. */
  width: number;
  /** Rendered height in CSS pixels. */
  height: number;
}

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((mod) => {
      // Point the worker at the locally served worker file.
      try {
        mod.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      } catch {
        // ignore — worker may already be configured
      }
      return mod;
    });
  }
  return pdfjsPromise;
}

/**
 * Render PDF pages to data URLs entirely in the browser using pdf.js.
 * Useful for building page grids, drag-to-reorder UIs, and previews.
 */
export async function renderPdfPageThumbnails(
  file: File | Blob | ArrayBuffer,
  options: ThumbnailOptions = {},
): Promise<PageThumbnail[]> {
  const { width = 180, scale = 2, pages, onProgress } = options;
  const pdfjs = await loadPdfJs();

  const data =
    file instanceof ArrayBuffer
      ? file
      : await (file as Blob).arrayBuffer();

  const loadingTask = pdfjs.getDocument({ data });
  const doc: PDFDocumentProxy = await loadingTask.promise;

  const total = doc.numPages;
  const indices = pages && pages.length ? pages.filter((i) => i >= 0 && i < total) : Array.from({ length: total }, (_, i) => i);

  const results: PageThumbnail[] = [];

  for (let i = 0; i < indices.length; i += 1) {
    const pageIndex = indices[i];
    const page = await doc.getPage(pageIndex + 1);
    const baseViewport = page.getViewport({ scale: 1 });
    const renderScale = (width / baseViewport.width) * scale;
    const viewport = page.getViewport({ scale: renderScale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Unable to acquire 2D canvas context.');

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    results.push({
      index: pageIndex,
      pageNumber: pageIndex + 1,
      dataUrl: canvas.toDataURL('image/png'),
      width: Math.round(viewport.width / scale),
      height: Math.round(viewport.height / scale),
    });

    onProgress?.(i + 1, indices.length);
  }

  await loadingTask.destroy();
  return results;
}

/**
 * Convenience helper: render a single page to a data URL.
 */
export async function renderPdfPage(
  file: File | Blob | ArrayBuffer,
  pageIndex: number,
  options: Omit<ThumbnailOptions, 'pages'> = {},
): Promise<PageThumbnail | null> {
  const [thumb] = await renderPdfPageThumbnails(file, {
    ...options,
    pages: [pageIndex],
  });
  return thumb ?? null;
}
