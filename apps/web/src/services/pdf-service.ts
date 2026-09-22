// pdf-service.ts
// Frontend service that orchestrates PDF operations.
//
// Everything runs client-side on pdf-lib / pdfjs-dist (see src/lib/pdf/*).
// The old Rust/WASM worker pipeline (src/lib/pdf/pdfLocal.ts -> packages/wasm)
// is NOT used: its PDF code is an unfinished stub that only knew
// merge/split/compress and threw "Unknown action" for everything else.
//
// Protect/Unlock still need the server API, because pdf-lib cannot encrypt.

import { PDFDocument } from 'pdf-lib';
import {
    mergePdfSources,
    rotatePdfPages,
    deletePdfPages,
    extractPdfPages,
    reorderPdfPages,
} from '../lib/pdf/operations';
import { splitPdf as splitPdfLib, parseRangeString } from '../lib/pdf/split';
import { compressPdf as compressPdfLib } from '../lib/pdf/compress';
import { watermarkPdf as watermarkPdfLib } from '../lib/pdf/watermark';
import { addPageNumbers, type PageNumberOptions } from '../lib/pdf/page-numbers';
import { parsePageRanges } from '../lib/pdf/ranges';
import { renderPdfPageThumbnails } from '../lib/pdf/thumbnails';
import { pdfToImages as pdfToImagesLib, type ImageFormat } from '../lib/pdf-to-image';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL as string) || '/api/pdf';

/** pdf-lib returns Uint8Array<ArrayBufferLike>; copy it so it is a valid BlobPart. */
function toPdfBlob(bytes: Uint8Array): Blob {
    return new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
}

async function zipBlobs(
    entries: { name: string; data: Uint8Array | Blob }[],
): Promise<Blob> {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    for (const entry of entries) {
        zip.file(entry.name, entry.data instanceof Blob ? entry.data : new Uint8Array(entry.data));
    }
    return zip.generateAsync({ type: 'blob' });
}

/** Page count without keeping the whole document around. */
async function pageCount(file: File | Blob): Promise<number> {
    const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    return doc.getPageCount();
}

/** Turn a user-typed range string into zero-based indices, with a helpful error. */
async function indicesFrom(file: File | Blob, input: string): Promise<number[]> {
    const total = await pageCount(file);
    const { indices, error } = parsePageRanges(input ?? '', total);
    if (error) throw new Error(error);
    if (indices.length === 0) throw new Error('No pages selected.');
    return indices;
}

async function postToApi(path: string, file: File, password: string): Promise<Blob> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('password', password);

    let resp: Response;
    try {
        resp = await fetch(`${API_BASE}${path}`, { method: 'POST', body: fd });
    } catch {
        throw new Error(
            'This tool needs the FluxConvert server, which is not reachable right now. Please try again later.',
        );
    }
    if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`Server error ${resp.status}: ${text.slice(0, 200) || resp.statusText}`);
    }
    return resp.blob();
}

export class PdfService {
    // --- Top-level orchestrator methods used by UI components ----

    static async handlePdfMerge(
        inputFiles: File[],
    ): Promise<{ blob: Blob; filename: string }> {
        const blob = await this.mergePdfs(inputFiles);
        return { blob, filename: 'merged.pdf' };
    }

    static async handlePdfSplit(
        inputFile: File,
        ranges: string,
    ): Promise<{ blobs: Blob[]; filenames: string[] }> {
        const parsed = ranges?.trim() ? parseRangeString(ranges) : [];
        const { outputs } = await splitPdfLib(inputFile, {
            mode: parsed.length ? 'ranges' : 'individual',
            ranges: parsed.length ? parsed : undefined,
        });
        return {
            blobs: outputs.map((o) => toPdfBlob(o.bytes)),
            filenames: outputs.map((o) => o.name),
        };
    }

    // --- Methods used directly by the uploader ---

    static async mergePdfs(files: File[]): Promise<Blob> {
        if (files.length < 2) {
            throw new Error('Select at least two PDF files to merge.');
        }
        const { bytes } = await mergePdfSources(files);
        return toPdfBlob(bytes);
    }

    /** Extract an inclusive 1-based page range into a single PDF. */
    static async splitPdf(file: File, start: number, end: number): Promise<Blob> {
        const total = await pageCount(file);
        const from = Math.max(1, Math.min(start || 1, total));
        const to = Math.max(from, Math.min(end || total, total));
        const indices = Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i);
        const { bytes } = await extractPdfPages(file, indices);
        return toPdfBlob(bytes);
    }

    /** Split into one PDF per page (or per range) and return a ZIP. */
    static async splitPdfToZip(file: File, ranges = ''): Promise<Blob> {
        const { blobs, filenames } = await this.handlePdfSplit(file, ranges);
        return zipBlobs(blobs.map((data, i) => ({ name: filenames[i], data })));
    }

    static async removePages(file: File, pagesToRemove: string): Promise<Blob> {
        const indices = await indicesFrom(file, pagesToRemove);
        const { bytes } = await deletePdfPages(file, indices);
        return toPdfBlob(bytes);
    }

    static async extractPages(file: File, pages: string): Promise<Blob> {
        const indices = await indicesFrom(file, pages);
        const { bytes } = await extractPdfPages(file, indices);
        return toPdfBlob(bytes);
    }

    static async organizePdf(file: File, order: number[]): Promise<Blob> {
        const { bytes } = await reorderPdfPages(file, order);
        return toPdfBlob(bytes);
    }

    /** Rotate every page by `angle` degrees (default a quarter turn clockwise). */
    static async rotatePdf(file: File, angle = 90): Promise<Blob> {
        const total = await pageCount(file);
        const rotations: Record<number, number> = {};
        for (let i = 0; i < total; i++) rotations[i] = angle;
        const { bytes } = await rotatePdfPages(file, rotations);
        return toPdfBlob(bytes);
    }

    static async watermarkPdf(file: File, text: string): Promise<Blob> {
        const label = (text ?? '').trim();
        if (!label) throw new Error('Enter the watermark text.');
        const { bytes } = await watermarkPdfLib(file, {
            type: 'text',
            text: label,
            position: 'tile',
            opacity: 0.2,
        });
        return toPdfBlob(bytes);
    }

    static async addPageNumbers(file: File, options: PageNumberOptions = {}): Promise<Blob> {
        const { bytes } = await addPageNumbers(file, options);
        return toPdfBlob(bytes);
    }

    static async compressPdf(file: File): Promise<Blob> {
        const { bytes } = await compressPdfLib(file, { stripMetadata: true });
        return toPdfBlob(bytes);
    }

    /** Render every page to an image; a single page returns the image, many return a ZIP. */
    static async pdfToImages(file: File, format: ImageFormat = 'jpeg'): Promise<Blob> {
        const pages = await pdfToImagesLib(file, { format, scale: 2 });
        if (pages.length === 0) throw new Error('The PDF has no pages to convert.');
        if (pages.length === 1) return pages[0].blob;
        return zipBlobs(pages.map((p) => ({ name: p.filename, data: p.blob })));
    }

    static async imageToPdf(files: File[]): Promise<Blob> {
        if (!files.length) throw new Error('Select at least one image.');
        const doc = await PDFDocument.create();
        for (const file of files) {
            const bytes = new Uint8Array(await file.arrayBuffer());
            const isPng =
                file.type === 'image/png' ||
                (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47);
            const isJpg = file.type === 'image/jpeg' || (bytes[0] === 0xff && bytes[1] === 0xd8);
            if (!isPng && !isJpg) {
                throw new Error(`${file.name}: only PNG and JPEG images can be placed in a PDF.`);
            }
            const image = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
            const page = doc.addPage([image.width, image.height]);
            page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        }
        return toPdfBlob(await doc.save());
    }

    static async getThumbnails(file: File): Promise<string[]> {
        const thumbs = await renderPdfPageThumbnails(file, { width: 180 });
        return thumbs.map((t) => t.dataUrl);
    }

    /**
     * Repair: parse the file leniently and write a fresh, well-formed document.
     * This fixes the common real-world cases (broken xref tables, trailing junk,
     * damaged metadata) that stop other viewers from opening a PDF.
     */
    static async repairPdf(file: File): Promise<Blob> {
        let doc: PDFDocument;
        try {
            doc = await PDFDocument.load(await file.arrayBuffer(), {
                ignoreEncryption: true,
                throwOnInvalidObject: false,
                updateMetadata: false,
            });
        } catch {
            throw new Error('This file is too damaged to repair — it could not be parsed as a PDF.');
        }
        const out = await PDFDocument.create();
        const copied = await out.copyPages(doc, doc.getPageIndices());
        copied.forEach((page) => out.addPage(page));
        if (out.getPageCount() === 0) throw new Error('No readable pages were found in this PDF.');
        return toPdfBlob(await out.save());
    }

    /** Extract the text of every page with pdfjs; falls back to OCR when a page has none. */
    static async extractText(
        file: File,
        onProgress?: (message: string) => void,
    ): Promise<{ page: number; text: string }[]> {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
        const pages: { page: number; text: string }[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
            onProgress?.(`Reading page ${i} of ${doc.numPages}...`);
            const content = await doc.getPage(i).then((p) => p.getTextContent());
            const text = content.items
                .map((item) => ('str' in item ? item.str : ''))
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
            pages.push({ page: i, text });
        }
        return pages;
    }

    /** OCR every page image with tesseract.js and return the text. */
    static async ocrPdf(file: File, onProgress?: (message: string) => void): Promise<Blob> {
        const embedded = await this.extractText(file, onProgress);
        const hasText = embedded.some((p) => p.text.length > 20);
        if (hasText) {
            const out = embedded.map((p) => `--- Page ${p.page} ---\n${p.text}`).join('\n\n');
            return new Blob([out], { type: 'text/plain;charset=utf-8' });
        }

        onProgress?.('No embedded text — running OCR...');
        const { default: Tesseract } = await import('tesseract.js');
        const images = await pdfToImagesLib(file, { format: 'png', scale: 2 });
        const chunks: string[] = [];
        for (const image of images) {
            onProgress?.(`OCR page ${image.pageNumber} of ${images.length}...`);
            const { data } = await Tesseract.recognize(image.blob, 'eng');
            chunks.push(`--- Page ${image.pageNumber} ---\n${data.text.trim()}`);
        }
        const text = chunks.join('\n\n').trim();
        if (!text) throw new Error('No text could be recognised in this document.');
        return new Blob([text], { type: 'text/plain;charset=utf-8' });
    }

    /** PDF text into a minimal, valid .docx (Word opens it natively). */
    static async pdfToWord(file: File, onProgress?: (message: string) => void): Promise<Blob> {
        const pages = await this.extractText(file, onProgress);
        const paragraphs = pages.flatMap((p) => [
            `Page ${p.page}`,
            ...(p.text ? p.text.split(/(?<=[.!?])\s+(?=[A-Z])/) : ['(no extractable text)']),
        ]);
        const escapeXml = (t: string) =>
            t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const body = paragraphs
            .map(
                (text) =>
                    `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text).slice(0, 8000)}</w:t></w:r></w:p>`,
            )
            .join('');

        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();
        zip.file(
            '[Content_Types].xml',
            `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
        );
        zip.file(
            '_rels/.rels',
            `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
        );
        zip.file(
            'word/document.xml',
            `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
        );
        return zip.generateAsync({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
    }

    /** PDF text into a spreadsheet: one row per line, split on runs of whitespace. */
    static async pdfToExcel(file: File, onProgress?: (message: string) => void): Promise<Blob> {
        const pages = await this.extractText(file, onProgress);
        const XLSX = await import('xlsx');
        const rows: (string | number)[][] = [['Page', 'Text']];
        for (const p of pages) {
            const lines = p.text ? p.text.split(/\s{2,}|•/).filter(Boolean) : [''];
            for (const line of lines) rows.push([p.page, line.trim()]);
        }
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Extracted');
        const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
        return new Blob([out], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
    }

    /** Spreadsheet into a PDF table, one page per sheet. */
    static async excelToPdf(file: File): Promise<Blob> {
        const XLSX = await import('xlsx');
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const { StandardFonts, rgb } = await import('pdf-lib');
        const doc = await PDFDocument.create();
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const bold = await doc.embedFont(StandardFonts.HelveticaBold);
        const size = 9;
        const margin = 40;

        for (const sheetName of wb.SheetNames) {
            const rows = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets[sheetName], {
                header: 1,
                blankrows: false,
            });
            let page = doc.addPage([595, 842]);
            let y = 842 - margin;
            page.drawText(sheetName, { x: margin, y, size: 14, font: bold, color: rgb(0.1, 0.1, 0.1) });
            y -= 24;

            for (const [rowIndex, row] of rows.entries()) {
                if (y < margin) {
                    page = doc.addPage([595, 842]);
                    y = 842 - margin;
                }
                const line = (row ?? [])
                    .map((cell) => String(cell ?? ''))
                    .join('   |   ')
                    // Standard PDF fonts are WinAnsi-only; drop anything they cannot draw.
                    .replace(/[^\x20-\x7E]/g, '')
                    .slice(0, 110);
                page.drawText(line, { x: margin, y, size, font: rowIndex === 0 ? bold : font });
                y -= size + 6;
            }
        }
        if (doc.getPageCount() === 0) throw new Error('This spreadsheet has no readable sheets.');
        return toPdfBlob(await doc.save());
    }

    // --- Server-side only (pdf-lib cannot encrypt/decrypt) ---

    static async protectPdf(file: File, password: string): Promise<Blob> {
        if (!password) throw new Error('Enter a password.');
        return postToApi('/protect', file, password);
    }

    static async unlockPdf(file: File, password: string): Promise<Blob> {
        if (!password) throw new Error('Enter the PDF password.');
        return postToApi('/unlock', file, password);
    }
}
