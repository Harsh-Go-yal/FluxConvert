// pdf-service.ts
// Frontend service that orchestrates PDF operations.
// NOTE: Protect/Unlock are performed via the server API (Python backend).
// Other PDF operations still use the local WASM pipeline (pdfLocal).

import {
    mergePdfLocal,
    splitPdfLocal,
    removePagesLocal,
    rotatePdfLocal,
    watermarkPdfLocal,
    compressPdfLocal,
    pdfToImagesLocal,
    imageToPdfLocal,
    getThumbnailsLocal,
    protectPdfLocal, // kept for completeness though not used for encryption anymore
    unlockPdfLocal   // kept for completeness though not used for decryption anymore
} from '../lib/pdf/pdfLocal';
import { ProcessingMode } from '../lib/pdf/pdf.types';

/**
 * Configure the backend API base URL.
 * - If NEXT_PUBLIC_API_URL is set at build time (Next.js / Vite), it will be used.
 * - otherwise the code defaults to same origin path `/api/pdf`.
 *
 * Make sure your Python API exposes:
 * POST ${API_BASE}/protect   -> accepts file + password -> returns protected PDF blob
 * POST ${API_BASE}/unlock    -> accepts file + password -> returns unlocked PDF blob
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL as string) || '/api/pdf';

export class PdfService {
    // --- Top-level orchestrator methods used by UI components ----

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
        // Keep the splitLocal behavior: return multiple blobs and filenames
        const blobs = await splitPdfLocal(inputFile, ranges);
        const filenames = blobs.map((_, i) => `split_${i + 1}_${inputFile.name}`);
        return { blobs, filenames };
    }

    // --- Methods used directly by index.tsx or other UI flow ---

    static async mergePdfs(files: File[]): Promise<Blob> {
        // Local/WASM merge (unchanged)
        return await mergePdfLocal(files);
    }

    static async splitPdf(file: File, start: number, end: number): Promise<Blob> {
        // Helper for single-range split used by some UI components
        const range = `${start}-${end}`;
        const blobs = await splitPdfLocal(file, range);
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

    /**
     * protectPdf:
     * Sends the file + password to the backend Python API for encryption.
     * The server should return the encrypted PDF bytes as the response body.
     *
     * @param file - the File object to protect
     * @param password - password string to apply
     * @returns Blob - protected PDF blob
     */
    static async protectPdf(file: File, password: string): Promise<Blob> {
        // Build FormData with file and password
        const fd = new FormData();
        fd.append('file', file, file.name);
        fd.append('password', password);

        const resp = await fetch(`${API_BASE}/protect`, {
            method: 'POST',
            body: fd,
            // credentials: 'include' // uncomment if your backend requires cookies/auth
        });

        if (!resp.ok) {
            // Try to read any server error text to make debugging easier
            const text = await resp.text().catch(() => '');
            throw new Error(`Protect API failed: ${resp.status} ${resp.statusText} ${text}`);
        }

        // The response body is the PDF bytes — return as Blob
        const blob = await resp.blob();
        return blob;
    }

    /**
     * unlockPdf:
     * Sends the password-protected file + password to the backend Python API to remove encryption.
     * The server should return the decrypted PDF bytes as the response body.
     *
     * @param file - the File object to unlock
     * @param password - password string used to decrypt the PDF
     * @returns Blob - decrypted PDF blob
     */
    static async unlockPdf(file: File, password: string): Promise<Blob> {
        const fd = new FormData();
        fd.append('file', file, file.name);
        fd.append('password', password);

        const resp = await fetch(`${API_BASE}/unlock`, {
            method: 'POST',
            body: fd,
            // credentials: 'include' // uncomment if your backend requires cookies/auth
        });

        if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            throw new Error(`Unlock API failed: ${resp.status} ${resp.statusText} ${text}`);
        }

        const blob = await resp.blob();
        return blob;
    }

    // --- other operations still local/WASM ---
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
