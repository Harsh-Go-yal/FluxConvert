import { PDFDocument } from 'pdf-lib';

export interface PdfInspection {
  pageCount: number;
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  encrypted: boolean;
  fileSize: number;
}

/**
 * Inspect a PDF file entirely in the browser using pdf-lib.
 * Returns page count and document metadata without uploading the file.
 */
export async function inspectPdf(file: File | Blob): Promise<PdfInspection> {
  const buffer = await file.arrayBuffer();
  let doc: PDFDocument;
  let encrypted = false;

  try {
    doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/encrypt/i.test(message)) {
      encrypted = true;
      doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    } else {
      throw err;
    }
  }

  const size = 'size' in file ? (file as File).size : (file as Blob).size;

  return {
    pageCount: doc.getPageCount(),
    title: doc.getTitle() ?? undefined,
    author: doc.getAuthor() ?? undefined,
    subject: doc.getSubject() ?? undefined,
    creator: doc.getCreator() ?? undefined,
    producer: doc.getProducer() ?? undefined,
    creationDate: doc.getCreationDate() ?? undefined,
    modificationDate: doc.getModificationDate() ?? undefined,
    encrypted,
    fileSize: size,
  };
}

/**
 * Quickly count pages in a PDF without loading the full document model.
 * Falls back to pdf-lib when the fast path fails.
 */
export async function countPdfPages(file: File | Blob): Promise<number> {
  try {
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder('latin1').decode(buffer);
    const matches = text.match(/\/Type\s*\/Page[^s]/g);
    if (matches && matches.length > 0) {
      return matches.length;
    }
  } catch {
    // fall through to pdf-lib
  }
  const info = await inspectPdf(file);
  return info.pageCount;
}
