import { PDFDocument } from 'pdf-lib';

export async function mergePDFs(pdfFiles: File[]): Promise<Uint8Array> {
    const mergedPdf = await PDFDocument.create();

    for (const file of pdfFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    return await mergedPdf.save();
}

export async function splitPDF(pdfFile: File): Promise<Uint8Array[]> {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const pageCount = pdf.getPageCount();
    const splitPdfs: Uint8Array[] = [];

    for (let i = 0; i < pageCount; i++) {
        const newPdf = await PDFDocument.create();
        const [page] = await newPdf.copyPages(pdf, [i]);
        newPdf.addPage(page);
        splitPdfs.push(await newPdf.save());
    }

    return splitPdfs;
}

export async function extractPageRange(pdfFile: File, start: number, end: number): Promise<Uint8Array> {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const pageCount = pdf.getPageCount();

    if (start < 1 || end > pageCount || start > end) {
        throw new Error("Invalid page range");
    }

    const newPdf = await PDFDocument.create();
    // pdf-lib uses 0-based indexing, so we subtract 1 from start and end
    // however, copyPages takes an array of indices.
    // We want pages from start to end (inclusive).
    const indices = [];
    for (let i = start - 1; i < end; i++) {
        indices.push(i);
    }

    const copiedPages = await newPdf.copyPages(pdf, indices);
    copiedPages.forEach((page) => newPdf.addPage(page));

    return await newPdf.save();
}
