import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.394/build/pdf.worker.min.mjs';

const handlers: Record<string, (payload: any) => Promise<any>> = {
    async MERGE({ fileBuffers }: { fileBuffers: ArrayBuffer[] }) {
        const mergedPdf = await PDFDocument.create();
        for (const buffer of fileBuffers) {
            const pdfDoc = await PDFDocument.load(buffer);
            const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }
        const mergedBytes = await mergedPdf.save();
        return mergedBytes.buffer;
    },

    async SPLIT({ fileBuffer, ranges }: { fileBuffer: ArrayBuffer, ranges: string }) {
        const srcDoc = await PDFDocument.load(fileBuffer);
        const pageCount = srcDoc.getPageCount();
        const parts = ranges.split(',').map(p => p.trim());
        const resultBuffers: ArrayBuffer[] = [];

        for (const part of parts) {
            const newPdf = await PDFDocument.create();
            const indicesForThisPart: number[] = [];

            if (part.includes('-')) {
                const [start, end] = part.split('-').map(p => parseInt(p));
                for (let i = Math.max(1, start); i <= Math.min(pageCount, end); i++) {
                    indicesForThisPart.push(i - 1);
                }
            } else {
                const pageNum = parseInt(part);
                if (pageNum >= 1 && pageNum <= pageCount) {
                    indicesForThisPart.push(pageNum - 1);
                }
            }

            if (indicesForThisPart.length > 0) {
                const copiedPages = await newPdf.copyPages(srcDoc, indicesForThisPart);
                copiedPages.forEach(page => newPdf.addPage(page));
                const bytes = await newPdf.save();
                resultBuffers.push(bytes.buffer as ArrayBuffer);
            }
        }
        return resultBuffers;
    },

    async REMOVE_PAGES({ fileBuffer, pagesToRemoveStr }: { fileBuffer: ArrayBuffer, pagesToRemoveStr: string }) {
        const srcDoc = await PDFDocument.load(fileBuffer);
        const pageCount = srcDoc.getPageCount();
        const pagesToRemoveIndices = new Set<number>();
        const parts = pagesToRemoveStr.split(',').map(p => p.trim());

        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(p => parseInt(p));
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = start; i <= end; i++) {
                        pagesToRemoveIndices.add(i - 1);
                    }
                }
            } else {
                const pageNum = parseInt(part);
                if (!isNaN(pageNum)) {
                    pagesToRemoveIndices.add(pageNum - 1);
                }
            }
        }

        const newPdf = await PDFDocument.create();
        const indicesToKeep = [];
        for (let i = 0; i < pageCount; i++) {
            if (!pagesToRemoveIndices.has(i)) {
                indicesToKeep.push(i);
            }
        }

        if (indicesToKeep.length === 0) {
            throw new Error("All pages removed!");
        }

        const copiedPages = await newPdf.copyPages(srcDoc, indicesToKeep);
        copiedPages.forEach((page) => newPdf.addPage(page));

        const newPdfBytes = await newPdf.save();
        return newPdfBytes.buffer as ArrayBuffer;
    },

    async ROTATE({ fileBuffer }: { fileBuffer: ArrayBuffer }) {
        const pdfDoc = await PDFDocument.load(fileBuffer);
        const pages = pdfDoc.getPages();
        pages.forEach(page => {
            page.setRotation(degrees(page.getRotation().angle + 90));
        });
        const modifiedBytes = await pdfDoc.save();
        return modifiedBytes.buffer as ArrayBuffer;
    },

    async WATERMARK({ fileBuffer, text }: { fileBuffer: ArrayBuffer, text: string }) {
        const pdfDoc = await PDFDocument.load(fileBuffer);
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        pages.forEach(page => {
            const { width, height } = page.getSize();
            page.drawText(text, {
                x: width / 2 - 100,
                y: height / 2,
                size: 50,
                font: font,
                color: rgb(0.7, 0.7, 0.7),
                rotate: degrees(45),
                opacity: 0.5,
            });
        });

        const modifiedBytes = await pdfDoc.save();
        return modifiedBytes.buffer as ArrayBuffer;
    },



    async COMPRESS({ fileBuffer, quality }: { fileBuffer: ArrayBuffer, quality: number }) {
        if (typeof OffscreenCanvas === 'undefined') {
            throw new Error("OffscreenCanvas not supported in this browser/worker.");
        }

        const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
        const newPdf = await PDFDocument.create();

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.0 });

            const canvas = new OffscreenCanvas(viewport.width, viewport.height);
            const context = canvas.getContext('2d');

            if (!context) continue;

            await page.render({ canvasContext: context as any, viewport: viewport } as any).promise;

            const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: quality || 0.7 });
            const imgData = await blob.arrayBuffer();

            const img = await newPdf.embedJpg(imgData);
            const newPage = newPdf.addPage([viewport.width, viewport.height]);
            newPage.drawImage(img, {
                x: 0,
                y: 0,
                width: viewport.width,
                height: viewport.height,
            });
        }

        const compressedBytes = await newPdf.save();
        return compressedBytes.buffer;
    },

    async PDF_TO_IMAGES({ fileBuffer }: { fileBuffer: ArrayBuffer }) {
        if (typeof OffscreenCanvas === 'undefined') {
            throw new Error("OffscreenCanvas not supported in this browser/worker.");
        }

        const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
        const zip = new JSZip();

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });

            const canvas = new OffscreenCanvas(viewport.width, viewport.height);
            const context = canvas.getContext('2d');

            if (!context) continue;

            await page.render({ canvasContext: context as any, viewport: viewport } as any).promise;

            const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
            const arrayBuffer = await blob.arrayBuffer();
            zip.file(`page_${i}.jpg`, arrayBuffer);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        return zipBlob.arrayBuffer();
    },

    async IMAGE_TO_PDF({ fileBuffers, fileTypes }: { fileBuffers: ArrayBuffer[], fileTypes: string[] }) {
        const pdfDoc = await PDFDocument.create();
        for (let i = 0; i < fileBuffers.length; i++) {
            const imgBytes = fileBuffers[i];
            const type = fileTypes[i];
            let img;
            if (type === 'image/jpeg' || type === 'jpg' || type === 'image/jpg') {
                img = await pdfDoc.embedJpg(imgBytes);
            } else if (type === 'image/png' || type === 'png') {
                img = await pdfDoc.embedPng(imgBytes);
            }

            if (img) {
                const page = pdfDoc.addPage([img.width, img.height]);
                page.drawImage(img, {
                    x: 0,
                    y: 0,
                    width: img.width,
                    height: img.height,
                });
            }
        }
        const pdfBytes = await pdfDoc.save();
        return pdfBytes.buffer;
    },

    async GET_THUMBNAILS({ fileBuffer }: { fileBuffer: ArrayBuffer }) {
        if (typeof OffscreenCanvas === 'undefined') {
            throw new Error("OffscreenCanvas not supported in this browser/worker.");
        }

        const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
        const thumbnails: ArrayBuffer[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.3 });

            const canvas = new OffscreenCanvas(viewport.width, viewport.height);
            const context = canvas.getContext('2d');

            if (!context) continue;

            await page.render({ canvasContext: context as any, viewport: viewport } as any).promise;

            const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 });
            thumbnails.push(await blob.arrayBuffer());
        }

        return thumbnails;
    }
};

self.onmessage = async (e: MessageEvent) => {
    const { id, type, payload } = e.data;
    if (handlers[type]) {
        try {
            const result = await handlers[type](payload);

            let transferables: Transferable[] = [];
            if (result instanceof ArrayBuffer) {
                transferables = [result];
            } else if (Array.isArray(result)) {
                transferables = result.filter(item => item instanceof ArrayBuffer);
            }

            self.postMessage({ id, success: true, data: result }, { transfer: transferables });
        } catch (error: any) {
            self.postMessage({ id, success: false, error: error.message || String(error) });
        }
    } else {
        self.postMessage({ id, success: false, error: `Unknown message type: ${type}` });
    }
};
