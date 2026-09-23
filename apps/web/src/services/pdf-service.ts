// pdf-service.ts
// Frontend service that orchestrates PDF operations.
//
// Everything runs client-side on pdf-lib / pdfjs-dist (see src/lib/pdf/*).
// The old Rust/WASM worker pipeline (src/lib/pdf/pdfLocal.ts -> packages/wasm)
// is NOT used: its PDF code is an unfinished stub that only knew
// merge/split/compress and threw "Unknown action" for everything else.
//
// Protect/Unlock still need the server API, because pdf-lib cannot encrypt.

// Types are erased at build time, so importing them costs nothing at runtime.
import type { PageNumberOptions } from '../lib/pdf/page-numbers';
import type { ImageFormat } from '../lib/pdf-to-image';
import type { CropMargins, CropOptions } from '../lib/pdf/crop';
import type { PageBox } from '../lib/pdf/rasterize';
import type { SignOptions } from '../lib/pdf/sign';
import type { CompareResult } from '../lib/pdf/compare';
// Page-range parsing is dependency-free, so it stays eager.
import { parsePageRanges } from '../lib/pdf/ranges';

/**
 * Heavy dependencies are loaded on demand.
 *
 * Importing them at the top of this file put pdf-lib, pdfjs and every PDF
 * helper into the bundle of all 31 tool pages, so opening "Merge PDF" also
 * downloaded the OCR, redaction and PowerPoint code. Each loader below becomes
 * its own chunk that is fetched the first time that capability is used, and
 * the browser caches it afterwards.
 */
const loadPdfLib = () => import('pdf-lib');
const loadOperations = () => import('../lib/pdf/operations');
const loadSplit = () => import('../lib/pdf/split');
const loadCompress = () => import('../lib/pdf/compress');
const loadWatermark = () => import('../lib/pdf/watermark');
const loadPageNumbers = () => import('../lib/pdf/page-numbers');
const loadThumbnails = () => import('../lib/pdf/thumbnails');
const loadPdfToImage = () => import('../lib/pdf-to-image');
const loadCrop = () => import('../lib/pdf/crop');
const loadRasterize = () => import('../lib/pdf/rasterize');
const loadSign = () => import('../lib/pdf/sign');
const loadCompare = () => import('../lib/pdf/compare');
const loadPptx = () => import('../lib/pdf-to-pptx');

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
    const { PDFDocument } = await loadPdfLib();
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

/**
 * Make a phone photo look like a scan: grayscale, then stretch contrast so the
 * paper goes white and the ink goes black.
 */
async function enhanceScan(source: File | Blob): Promise<Blob> {
    if (typeof document === 'undefined') return source;
    const bitmap = await createImageBitmap(source);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    if (!context) return source;

    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;

    let min = 255;
    let max = 0;
    for (let i = 0; i < data.length; i += 4) {
        const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = data[i + 1] = data[i + 2] = luma;
        if (luma < min) min = luma;
        if (luma > max) max = luma;
    }
    const span = Math.max(1, max - min);
    for (let i = 0; i < data.length; i += 4) {
        // Pull the darkest 15% to black and the lightest 15% to white.
        const stretched = ((data[i] - min) / span) * 255;
        const value = Math.min(255, Math.max(0, (stretched - 38) * 1.42));
        data[i] = data[i + 1] = data[i + 2] = value;
    }
    context.putImageData(image, 0, 0);

    return new Promise((resolve) =>
        canvas.toBlob((blob) => resolve(blob ?? source), 'image/jpeg', 0.9),
    );
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
        const { splitPdf: splitPdfLib, parseRangeString } = await loadSplit();
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
        const { mergePdfSources } = await loadOperations();
        const { bytes } = await mergePdfSources(files);
        return toPdfBlob(bytes);
    }

    /** Extract an inclusive 1-based page range into a single PDF. */
    static async splitPdf(file: File, start: number, end: number): Promise<Blob> {
        const total = await pageCount(file);
        const from = Math.max(1, Math.min(start || 1, total));
        const to = Math.max(from, Math.min(end || total, total));
        const indices = Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i);
        const { extractPdfPages } = await loadOperations();
        const { bytes } = await extractPdfPages(file, indices);
        return toPdfBlob(bytes);
    }

    /** Split into one PDF per page (or per range) and return a ZIP. */
    static async splitPdfToZip(file: File, ranges = ''): Promise<Blob> {
        const { blobs, filenames } = await this.handlePdfSplit(file, ranges);
        return zipBlobs(blobs.map((data, i) => ({ name: filenames[i], data })));
    }

    static async removePages(file: File, pagesToRemove: string): Promise<Blob> {
        // An empty selection means "all pages" to the range parser, which would
        // quietly try to delete the entire document. Ask for a selection instead.
        if (!pagesToRemove?.trim()) throw new Error('Choose which pages to remove.');
        const indices = await indicesFrom(file, pagesToRemove);
        const { deletePdfPages } = await loadOperations();
        const { bytes } = await deletePdfPages(file, indices);
        return toPdfBlob(bytes);
    }

    static async extractPages(file: File, pages: string): Promise<Blob> {
        const indices = await indicesFrom(file, pages);
        const { extractPdfPages } = await loadOperations();
        const { bytes } = await extractPdfPages(file, indices);
        return toPdfBlob(bytes);
    }

    /**
     * Reorder pages, optionally rotating some of them. `order` lists the original
     * zero-based page indices in their new order (pages left out are dropped);
     * `rotations` is keyed by position in that new order.
     */
    static async organizePdf(
        file: File,
        order: number[],
        rotations: Record<number, number> = {},
    ): Promise<Blob> {
        if (!order.length) throw new Error('Keep at least one page.');
        const { reorderPdfPages, rotatePdfPages } = await loadOperations();
        const { bytes } = await reorderPdfPages(file, order);
        if (Object.keys(rotations).length === 0) return toPdfBlob(bytes);
        const { bytes: rotated } = await rotatePdfPages(bytes, rotations);
        return toPdfBlob(rotated);
    }

    /** Rotate every page by `angle` degrees (default a quarter turn clockwise). */
    static async rotatePdf(file: File, angle = 90): Promise<Blob> {
        const total = await pageCount(file);
        const rotations: Record<number, number> = {};
        for (let i = 0; i < total; i++) rotations[i] = angle;
        const { rotatePdfPages } = await loadOperations();
        const { bytes } = await rotatePdfPages(file, rotations);
        return toPdfBlob(bytes);
    }

    static async watermarkPdf(file: File, text: string): Promise<Blob> {
        const label = (text ?? '').trim();
        if (!label) throw new Error('Enter the watermark text.');
        const { watermarkPdf: watermarkPdfLib } = await loadWatermark();
        const { bytes } = await watermarkPdfLib(file, {
            type: 'text',
            text: label,
            position: 'tile',
            opacity: 0.2,
        });
        return toPdfBlob(bytes);
    }

    static async addPageNumbers(file: File, options: PageNumberOptions = {}): Promise<Blob> {
        const { addPageNumbers } = await loadPageNumbers();
        const { bytes } = await addPageNumbers(file, options);
        return toPdfBlob(bytes);
    }

    static async compressPdf(file: File): Promise<Blob> {
        const { compressPdf: compressPdfLib } = await loadCompress();
        const { bytes } = await compressPdfLib(file, { stripMetadata: true });
        return toPdfBlob(bytes);
    }

    /** Render every page to an image; a single page returns the image, many return a ZIP. */
    static async pdfToImages(file: File, format: ImageFormat = 'jpeg'): Promise<Blob> {
        const { pdfToImages: pdfToImagesLib } = await loadPdfToImage();
        const pages = await pdfToImagesLib(file, { format, scale: 2 });
        if (pages.length === 0) throw new Error('The PDF has no pages to convert.');
        if (pages.length === 1) return pages[0].blob;
        return zipBlobs(pages.map((p) => ({ name: p.filename, data: p.blob })));
    }

    static async imageToPdf(files: File[]): Promise<Blob> {
        if (!files.length) throw new Error('Select at least one image.');
        const { PDFDocument } = await loadPdfLib();
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
        const { renderPdfPageThumbnails } = await loadThumbnails();
        const thumbs = await renderPdfPageThumbnails(file, { width: 180 });
        return thumbs.map((t) => t.dataUrl);
    }

    /**
     * Repair: parse the file leniently and write a fresh, well-formed document.
     * This fixes the common real-world cases (broken xref tables, trailing junk,
     * damaged metadata) that stop other viewers from opening a PDF.
     */
    static async repairPdf(file: File): Promise<Blob> {
        const { PDFDocument } = await loadPdfLib();
        let doc: Awaited<ReturnType<typeof PDFDocument.load>>;
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
        const [{ default: Tesseract }, { pdfToImages: pdfToImagesLib }] = await Promise.all([
            import('tesseract.js'),
            loadPdfToImage(),
        ]);
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
        const [XLSX, { PDFDocument, StandardFonts, rgb }] = await Promise.all([import('xlsx'), loadPdfLib()]);
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
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

    /** Trim margins from every page. */
    static async cropPdf(file: File, margins: CropMargins, options: CropOptions = {}): Promise<Blob> {
        const { cropPdf: cropPdfLib } = await loadCrop();
        const { bytes } = await cropPdfLib(file, margins, options);
        return toPdfBlob(bytes);
    }

    /**
     * Redact by rendering each page to an image with the selected areas painted
     * over, then rebuilding the PDF. The covered text is genuinely removed —
     * drawing black rectangles on top of a text layer only hides it.
     */
    static async redactPdf(
        file: File,
        boxes: PageBox[],
        onProgress?: (percent: number) => void,
    ): Promise<Blob> {
        if (!boxes.length) throw new Error('Draw at least one area to redact.');
        const { rasterizePages, pdfFromImages } = await loadRasterize();
        const scale = 2;
        const pages = await rasterizePages(file, {
            scale,
            boxes,
            format: 'image/png', // lossless, so redacted edges stay crisp
            onProgress: (percent) => onProgress?.(percent),
        });
        return toPdfBlob(await pdfFromImages(pages, scale));
    }

    /** Stamp a visible signature (drawn or typed). Not a cryptographic signature. */
    static async signPdf(file: File, options: SignOptions): Promise<Blob> {
        const { signPdf: signPdfLib } = await loadSign();
        const { bytes } = await signPdfLib(file, options);
        return toPdfBlob(bytes);
    }

    /** Add text on top of pages at chosen positions. */
    static async editPdf(
        file: File,
        annotations: { page: number; x: number; y: number; text: string; size?: number; color?: { r: number; g: number; b: number } }[],
    ): Promise<Blob> {
        if (!annotations.length) throw new Error('Add at least one text box.');
        const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
        const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const pages = doc.getPages();

        for (const note of annotations) {
            const page = pages[Math.min(Math.max(0, note.page), pages.length - 1)];
            if (!page) continue;
            const { width, height } = page.getSize();
            const size = note.size ?? 14;
            const color = note.color ?? { r: 0, g: 0, b: 0 };
            // Positions arrive as top-left fractions; PDF measures from the bottom.
            page.drawText(note.text, {
                x: note.x * width,
                y: height - note.y * height - size,
                size,
                font,
                color: rgb(color.r, color.g, color.b),
                maxWidth: width - note.x * width - 20,
            });
        }
        return toPdfBlob(await doc.save());
    }

    /** Compare two PDFs and return a self-contained HTML report. */
    static async comparePdfs(fileA: File, fileB: File): Promise<{ blob: Blob; result: CompareResult }> {
        const { comparePdfs: comparePdfsLib, comparisonToHtml } = await loadCompare();
        const result = await comparePdfsLib(fileA, fileB);
        const html = comparisonToHtml(result, fileA.name, fileB.name);
        return { blob: new Blob([html], { type: 'text/html;charset=utf-8' }), result };
    }

    /** One slide per page, as a .pptx. */
    static async pdfToPowerPoint(file: File, onProgress?: (percent: number) => void): Promise<Blob> {
        const { pdfToPptx: pdfToPptxLib } = await loadPptx();
        return pdfToPptxLib(file, { onProgress: (percent) => onProgress?.(percent) });
    }

    /**
     * Flatten for archiving: pages become images, so fonts, forms and layers can
     * never render differently later. This is a self-contained archival PDF, not
     * a certified PDF/A file — real PDF/A conformance needs an embedded colour
     * profile and validation the browser cannot do. The UI says so.
     */
    static async archivePdf(file: File, onProgress?: (percent: number) => void): Promise<Blob> {
        const { flattenPdf } = await loadRasterize();
        const bytes = await flattenPdf(file, {
            scale: 2,
            format: 'image/jpeg',
            quality: 0.92,
            onProgress: (percent) => onProgress?.(percent),
        });
        return toPdfBlob(bytes);
    }

    /** Photos of a document -> a clean, high-contrast PDF. */
    static async scanToPdf(images: (File | Blob)[], enhance = true): Promise<Blob> {
        if (!images.length) throw new Error('Capture or select at least one page.');
        const { PDFDocument } = await loadPdfLib();
        const doc = await PDFDocument.create();

        for (const image of images) {
            const processed = enhance ? await enhanceScan(image) : image;
            const bytes = new Uint8Array(await processed.arrayBuffer());
            const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
            const embedded = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
            const page = doc.addPage([embedded.width, embedded.height]);
            page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
        }
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
