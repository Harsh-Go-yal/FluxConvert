import {
    mergePdfLocal,
    splitPdfLocal,
    removePagesLocal,
    rotatePdfLocal,
    watermarkPdfLocal,
    compressPdfLocal,
    pdfToImagesLocal,
    imageToPdfLocal,
    getThumbnailsLocal
} from '../lib/pdf/pdfLocal';
import { ProcessingMode } from '../lib/pdf/pdf.types';

// Note: Currently defaulting to Local mode for most operations until Remote counterparts are fully implemented.
// The orchestrator logic can be expanded here or in pdfClient.ts as needed.

export class PdfService {
    static async handlePdfMerge(
        inputFiles: File[],
        mode: ProcessingMode = 'auto'
    ): Promise<{ blob: Blob; filename: string }> {
        const blob = await this.mergePdfs(inputFiles);
        return { blob, filename: 'merged.pdf' };
    }

    static async handlePdfSplit(
        inputFile: File,
        ranges: string,
        mode: ProcessingMode = 'auto'
    ): Promise<{ blobs: Blob[]; filenames: string[] }> {
        // This method returns multiple blobs, but the index.tsx expects a single blob for split currently?
        // Checking index.tsx: "blob = await PdfService.splitPdf(files[0], start, end);"
        // It expects a single blob. The worker returns Blob[].
        // We need to align this. If index.tsx expects one blob, maybe it expects a ZIP or just the first split?
        // Let's look at index.tsx again. It calls `splitPdf(files[0], start, end)`.
        // My previous implementation of splitPdf in pdfLocal returns Blob[].
        // I will implement `splitPdf` below to match index.tsx signature (start, end) and return a single Blob (the extracted range).

        // For the "handlePdfSplit" used by PdfSplitForm, we keep the array return.
        const blobs = await splitPdfLocal(inputFile, ranges);
        const filenames = blobs.map((_, i) => `split_${i + 1}_${inputFile.name}`);
        return { blobs, filenames };
    }

    // --- Methods called by index.tsx ---

    static async mergePdfs(files: File[]): Promise<Blob> {
        return await mergePdfLocal(files);
    }

    static async splitPdf(file: File, start: number, end: number): Promise<Blob> {
        // Construct range string "start-end"
        const range = `${start}-${end}`;
        const blobs = await splitPdfLocal(file, range);
        // Return the first blob (since we asked for one range)
        if (blobs.length > 0) return blobs[0];
        throw new Error("Split failed to produce output");
    }

    static async removePages(file: File, pagesToRemove: string): Promise<Blob> {
        return await removePagesLocal(file, pagesToRemove);
    }

    static async rotatePdf(file: File): Promise<Blob> {
        return await rotatePdfLocal(file);
    }

    static async watermarkPdf(file: File, text: string): Promise<Blob> {
        return await watermarkPdfLocal(file, text);
    }

    static async protectPdf(file: File, password: string): Promise<Blob> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('password', password);

        const response = await fetch('/pdf/protect', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Failed to protect PDF');
        }

        return await response.blob();
    }

    static async unlockPdf(file: File, password: string): Promise<Blob> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('password', password);

        const response = await fetch('/pdf/unlock', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Failed to unlock PDF');
        }

        return await response.blob();
    }

    static async compressPdf(file: File): Promise<Blob> {
        return await compressPdfLocal(file);
    }

    static async pdfToImages(file: File): Promise<Blob> {
        return await pdfToImagesLocal(file);
    }

    static async imageToPdf(files: File[]): Promise<Blob> {
        return await imageToPdfLocal(files);
    }

    static async getThumbnails(file: File): Promise<string[]> {
        return await getThumbnailsLocal(file);
    }
}
