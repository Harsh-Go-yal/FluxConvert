import { PDFDocument } from 'pdf-lib';

export interface PdfMeta {
  pageCount: number;
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  fileSize: number;
}

/**
 * Read basic metadata from a PDF file entirely in the browser.
 * Never uploads the file anywhere.
 */
export async function readPdfMeta(file: File | Blob): Promise<PdfMeta> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  const parseDate = (value?: string): Date | undefined => {
    if (!value) return undefined;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  };

  return {
    pageCount: doc.getPageCount(),
    title: doc.getTitle() ?? undefined,
    author: doc.getAuthor() ?? undefined,
    subject: doc.getSubject() ?? undefined,
    creator: doc.getCreator() ?? undefined,
    producer: doc.getProducer() ?? undefined,
    creationDate: parseDate(doc.getCreationDate()?.toISOString()),
    modificationDate: parseDate(doc.getModificationDate()?.toISOString()),
    fileSize: file.size,
  };
}

/**
 * Quick page-count helper that avoids loading the full metadata payload.
 */
export async function getPdfPageCount(file: File | Blob): Promise<number> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.getPageCount();
}
