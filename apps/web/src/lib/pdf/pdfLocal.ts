import { PdfAction, PdfWorkerRequest, PdfWorkerResponse } from './pdf.types';

let worker: Worker | null = null;
const pendingRequests = new Map<string, { resolve: (data: any) => void; reject: (err: any) => void }>();

function getWorker(): Worker {
    if (!worker) {
        worker = new Worker(new URL('../../workers/pdf.worker.ts', import.meta.url));
        worker.onmessage = (e: MessageEvent<PdfWorkerResponse>) => {
            const { id, success, data, error } = e.data;
            const request = pendingRequests.get(id);
            if (request) {
                if (success) {
                    request.resolve(data);
                } else {
                    request.reject(new Error(error));
                }
                pendingRequests.delete(id);
            }
        };
        worker.onerror = (err) => {
            console.error('PDF Worker Error:', err);
        };
    }
    return worker;
}

function sendToWorker(type: PdfAction, payload: any): Promise<any> {
    const worker = getWorker();
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
        pendingRequests.set(id, { resolve, reject });

        let transferables: Transferable[] = [];
        if (payload.fileBuffers) {
            transferables = payload.fileBuffers;
        } else if (payload.fileBuffer) {
            transferables = [payload.fileBuffer];
        }

        worker.postMessage({ id, type, payload }, transferables);
    });
}

export async function mergePdfLocal(files: File[]): Promise<Blob> {
    const fileBuffers = await Promise.all(files.map(f => f.arrayBuffer()));
    const resultBuffer = await sendToWorker('MERGE', { fileBuffers }) as ArrayBuffer;
    return new Blob([resultBuffer], { type: 'application/pdf' });
}

export async function splitPdfLocal(file: File, ranges: string): Promise<Blob[]> {
    const fileBuffer = await file.arrayBuffer();
    const resultBuffers = await sendToWorker('SPLIT', { fileBuffer, ranges }) as ArrayBuffer[];
    return resultBuffers.map(buffer => new Blob([buffer], { type: 'application/pdf' }));
}

export async function removePagesLocal(file: File, pagesToRemoveStr: string): Promise<Blob> {
    const fileBuffer = await file.arrayBuffer();
    const resultBuffer = await sendToWorker('REMOVE_PAGES', { fileBuffer, pagesToRemoveStr }) as ArrayBuffer;
    return new Blob([resultBuffer], { type: 'application/pdf' });
}

export async function rotatePdfLocal(file: File): Promise<Blob> {
    const fileBuffer = await file.arrayBuffer();
    const resultBuffer = await sendToWorker('ROTATE', { fileBuffer }) as ArrayBuffer;
    return new Blob([resultBuffer], { type: 'application/pdf' });
}

export async function watermarkPdfLocal(file: File, text: string): Promise<Blob> {
    const fileBuffer = await file.arrayBuffer();
    const resultBuffer = await sendToWorker('WATERMARK', { fileBuffer, text }) as ArrayBuffer;
    return new Blob([resultBuffer], { type: 'application/pdf' });
}



export async function compressPdfLocal(file: File, quality: number = 0.7): Promise<Blob> {
    const fileBuffer = await file.arrayBuffer();
    const resultBuffer = await sendToWorker('COMPRESS', { fileBuffer, quality }) as ArrayBuffer;
    return new Blob([resultBuffer], { type: 'application/pdf' });
}

export async function pdfToImagesLocal(file: File): Promise<Blob> {
    const fileBuffer = await file.arrayBuffer();
    const resultBuffer = await sendToWorker('PDF_TO_IMAGES', { fileBuffer }) as ArrayBuffer;
    return new Blob([resultBuffer], { type: 'application/zip' });
}

export async function imageToPdfLocal(files: File[]): Promise<Blob> {
    const fileBuffers = await Promise.all(files.map(f => f.arrayBuffer()));
    const fileTypes = files.map(f => f.type);
    const resultBuffer = await sendToWorker('IMAGE_TO_PDF', { fileBuffers, fileTypes }) as ArrayBuffer;
    return new Blob([resultBuffer], { type: 'application/pdf' });
}

export async function getThumbnailsLocal(file: File): Promise<string[]> {
    const fileBuffer = await file.arrayBuffer();
    const resultBuffers = await sendToWorker('GET_THUMBNAILS', { fileBuffer }) as ArrayBuffer[];
    return resultBuffers.map(buffer => URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' })));
}
