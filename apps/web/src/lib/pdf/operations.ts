import { PDFDocument, degrees } from 'pdf-lib';

export interface PageOperationResult {
  bytes: Uint8Array;
  pageCount: number;
}

/**
 * Load a PDF from a File/Blob/ArrayBuffer into a pdf-lib document.
 */
async function loadDocument(
  source: File | Blob | ArrayBuffer | Uint8Array,
): Promise<PDFDocument> {
  let data: ArrayBuffer | Uint8Array;
  if (source instanceof Uint8Array) {
    data = source;
  } else if (source instanceof ArrayBuffer) {
    data = source;
  } else {
    data = await (source as Blob).arrayBuffer();
  }
  return PDFDocument.load(data, { ignoreEncryption: true });
}

/**
 * Rotate specific pages by a given angle (degrees). Angle is added to the
 * existing rotation of each page and normalized to [0, 360).
 */
export async function rotatePdfPages(
  source: File | Blob | ArrayBuffer | Uint8Array,
  rotations: Record<number, number>,
): Promise<PageOperationResult> {
  const doc = await loadDocument(source);
  const pages = doc.getPages();

  for (const [key, delta] of Object.entries(rotations)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= pages.length) continue;
    if (!Number.isFinite(delta) || delta === 0) continue;
    const page = pages[index];
    const current = page.getRotation().angle ?? 0;
    const next = (((current + delta) % 360) + 360) % 360;
    page.setRotation(degrees(next));
  }

  const bytes = await doc.save();
  return { bytes, pageCount: pages.length };
}

/**
 * Delete the given zero-based page indices from the document.
 * At least one page must remain.
 */
export async function deletePdfPages(
  source: File | Blob | ArrayBuffer | Uint8Array,
  indices: number[],
): Promise<PageOperationResult> {
  const doc = await loadDocument(source);
  const total = doc.getPageCount();
  const toRemove = Array.from(new Set(indices))
    .filter((i) => Number.isInteger(i) && i >= 0 && i < total)
    .sort((a, b) => b - a); // remove from the end to keep indices stable

  if (toRemove.length >= total) {
    throw new Error('Cannot remove every page from the document.');
  }

  for (const index of toRemove) {
    doc.removePage(index);
  }

  const bytes = await doc.save();
  return { bytes, pageCount: doc.getPageCount() };
}

/**
 * Reorder pages according to a new order array of zero-based indices.
 * The array must contain every page index exactly once.
 */
export async function reorderPdfPages(
  source: File | Blob | ArrayBuffer | Uint8Array,
  order: number[],
): Promise<PageOperationResult> {
  const doc = await loadDocument(source);
  const total = doc.getPageCount();

  if (order.length !== total) {
    throw new Error(`Order must contain exactly ${total} page indices.`);
  }
  const seen = new Set<number>();
  for (const i of order) {
    if (!Number.isInteger(i) || i < 0 || i >= total || seen.has(i)) {
      throw new Error('Order contains an invalid or duplicate page index.');
    }
    seen.add(i);
  }

  const copy = await PDFDocument.create();
  const copied = await copy.copyPages(doc, order);
  copied.forEach((page) => copy.addPage(page));

  const bytes = await copy.save();
  return { bytes, pageCount: copy.getPageCount() };
}

/**
 * Extract a subset of pages (zero-based indices) into a new PDF.
 */
export async function extractPdfPages(
  source: File | Blob | ArrayBuffer | Uint8Array,
  indices: number[],
): Promise<PageOperationResult> {
  const doc = await loadDocument(source);
  const total = doc.getPageCount();
  const valid = Array.from(new Set(indices))
    .filter((i) => Number.isInteger(i) && i >= 0 && i < total)
    .sort((a, b) => a - b);

  if (valid.length === 0) {
    throw new Error('No valid pages selected for extraction.');
  }

  const out = await PDFDocument.create();
  const copied = await out.copyPages(doc, valid);
  copied.forEach((page) => out.addPage(page));

  const bytes = await out.save();
  return { bytes, pageCount: out.getPageCount() };
}

/**
 * Merge multiple PDF sources into a single document.
 */
export async function mergePdfSources(
  sources: (File | Blob | ArrayBuffer | Uint8Array)[],
): Promise<PageOperationResult> {
  if (!sources.length) throw new Error('No documents provided to merge.');
  const out = await PDFDocument.create();

  for (const source of sources) {
    const doc = await loadDocument(source);
    const copied = await out.copyPages(doc, doc.getPageIndices());
    copied.forEach((page) => out.addPage(page));
  }

  const bytes = await out.save();
  return { bytes, pageCount: out.getPageCount() };
}

/**
 * Trigger a browser download for a generated PDF byte array.
 */
export function downloadPdfBytes(
  bytes: Uint8Array,
  filename: string,
): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
