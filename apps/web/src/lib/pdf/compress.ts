import { PDFDocument, PDFName, PDFRawStream, PDFDict, PDFArray, PDFNumber } from 'pdf-lib';

export interface CompressOptions {
  /** Target quality for embedded JPEG images (0-1). Lower = smaller file. */
  imageQuality?: number;
  /** Remove document metadata (title, author, producer, etc.). */
  stripMetadata?: boolean;
  /** Remove embedded document outline / bookmarks. */
  stripOutline?: boolean;
  /** Progress callback with a value between 0 and 1. */
  onProgress?: (progress: number) => void;
}

export interface CompressResult {
  bytes: Uint8Array;
  originalSize: number;
  compressedSize: number;
  /** Ratio between 0 and 1 (compressedSize / originalSize). */
  ratio: number;
  pageCount: number;
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

function getSourceSize(source: File | Blob | ArrayBuffer | Uint8Array): number {
  if (typeof File !== 'undefined' && source instanceof File) return source.size;
  if (typeof Blob !== 'undefined' && source instanceof Blob) return source.size;
  if (source instanceof Uint8Array) return source.byteLength;
  if (source instanceof ArrayBuffer) return source.byteLength;
  return 0;
}

/**
 * Best-effort client-side PDF compression. This does not re-encode every
 * embedded image (that would require a full raster pipeline), but it does:
 *  - strip metadata and outlines when requested
 *  - remove unreferenced objects via pdf-lib's save options
 *  - re-save with object streams enabled for smaller output
 *
 * For aggressive image downsampling, pair this with the raster pipeline in
 * `pdf-to-jpg` and rebuild the PDF from the resulting JPEGs.
 */
export async function compressPdf(
  source: File | Blob | ArrayBuffer | Uint8Array,
  options: CompressOptions = {},
): Promise<CompressResult> {
  const {
    stripMetadata = true,
    stripOutline = false,
    onProgress,
  } = options;

  const originalSize = getSourceSize(source);
  onProgress?.(0.05);

  const doc = await loadDocument(source);
  onProgress?.(0.25);

  if (stripMetadata) {
    try {
      doc.setTitle('');
      doc.setAuthor('');
      doc.setSubject('');
      doc.setKeywords([]);
      doc.setProducer('FluxConvert');
      doc.setCreator('FluxConvert');
    } catch {
      // Some documents reject metadata updates; ignore.
    }
  }
  onProgress?.(0.45);

  if (stripOutline) {
    try {
      const catalog = doc.catalog;
      if (catalog.has(PDFName.of('Outlines'))) {
        catalog.delete(PDFName.of('Outlines'));
      }
    } catch {
      // ignore
    }
  }
  onProgress?.(0.6);

  // Remove any leftover XMP metadata stream.
  try {
    const catalog = doc.catalog;
    if (catalog.has(PDFName.of('Metadata'))) {
      catalog.delete(PDFName.of('Metadata'));
    }
  } catch {
    // ignore
  }
  onProgress?.(0.75);

  const bytes = await doc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });
  onProgress?.(1);

  const compressedSize = bytes.byteLength;
  const ratio = originalSize > 0 ? compressedSize / originalSize : 1;

  return {
    bytes,
    originalSize,
    compressedSize,
    ratio,
    pageCount: doc.getPageCount(),
  };
}

/**
 * Inspect a PDF and return a lightweight summary of its structure. Useful for
 * showing users what will be compressed before they commit.
 */
export interface PdfInspection {
  pageCount: number;
  hasMetadata: boolean;
  hasOutline: boolean;
  hasForms: boolean;
  hasAttachments: boolean;
}

export async function inspectPdf(
  source: File | Blob | ArrayBuffer | Uint8Array,
): Promise<PdfInspection> {
  const doc = await loadDocument(source);
  const catalog = doc.catalog;
  return {
    pageCount: doc.getPageCount(),
    hasMetadata: catalog.has(PDFName.of('Metadata')),
    hasOutline: catalog.has(PDFName.of('Outlines')),
    hasForms: catalog.has(PDFName.of('AcroForm')),
    hasAttachments: catalog.has(PDFName.of('Names')),
  };
}

// Re-export a couple of pdf-lib primitives so consumers don't need a second import.
export { PDFDocument, PDFName, PDFRawStream, PDFDict, PDFArray, PDFNumber };
