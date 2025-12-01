/// <reference lib="webworker" />
// pdf.worker.ts
// Web worker that handles CPU-heavy local/WASM PDF operations.
// IMPORTANT: Encryption (protect/unlock) is moved to the server-side.
// This worker WILL NO LONGER attempt to call pdf-lib.encrypt() (which caused the crash).

import init, { merge_pdfs, split_pdf, compress_pdf } from '@pdf-solutions/wasm';
import wasmUrl from '@pdf-solutions/wasm/flux_wasm_bg.wasm';

// Fix for TypeScript error: self is inferred as Window instead of DedicatedWorkerGlobalScope
const ctx = self as unknown as DedicatedWorkerGlobalScope;

let isInitialized = false;

/**
 * initializeWasm()
 * Loads the wasm module once per worker lifecycle.
 */
async function initializeWasm() {
    if (!isInitialized) {
        // Construct absolute URL to the wasm file (helps when bundlers change public paths)
        const fullUrl = new URL(wasmUrl, ctx.location.origin).href;
        await init(fullUrl);
        isInitialized = true;
    }
}

/**
 * Worker message handler:
 * Expects messages of shape: { action: string, payload: any, id: string }
 *
 * Supported actions:
 * - 'merge'     -> merges multiple ArrayBuffer PDF inputs (expects payload.fileBuffers: Array<ArrayBuffer>)
 * - 'split'     -> splits a PDF (expects payload.fileBuffer: ArrayBuffer)
 * - 'compress'  -> compresses a PDF (expects payload.fileBuffer: ArrayBuffer, payload.quality?: number)
 *
 * NOTE: 'protect' and 'unlock' are intentionally removed from the worker because
 * pdf-lib does not implement encryption and trying to call pdf-lib.encrypt()
 * caused runtime errors in the browser. Encryption is handled by the backend API.
 */
ctx.onmessage = async (e: MessageEvent) => {
    const { action, payload, id } = e.data;

    try {
        await initializeWasm();
        let result: Uint8Array | ArrayBuffer | Uint8Array[] | ArrayBuffer[] | null = null;

        switch (action) {
            case 'merge':
                // payload.fileBuffers is Array<ArrayBuffer>
                result = merge_pdfs(payload.fileBuffers.map((b: ArrayBuffer) => new Uint8Array(b)));
                break;

            case 'split':
                // payload.fileBuffer is ArrayBuffer
                result = split_pdf(new Uint8Array(payload.fileBuffer));
                break;

            case 'compress':
                // payload.fileBuffer is ArrayBuffer; payload.quality optional
                result = compress_pdf(new Uint8Array(payload.fileBuffer), payload.quality || 50);
                break;

            // PROTECT / UNLOCK intentionally not supported in worker
            case 'protect':
            case 'unlock':
                throw new Error("Local (WASM) encrypt/decrypt is not supported. Please use the server API for protect/unlock operations.");

            default:
                throw new Error(`Unknown action: ${action}`);
        }

        // Post back result as ArrayBuffer (or Array<ArrayBuffer>) for the main thread
        let responseResult: ArrayBuffer | ArrayBuffer[];
        let transferList: Transferable[] = [];

        if (Array.isArray(result)) {
            // Handle array of results (e.g. from split)
            const buffers = result.map(r => {
                const b = r instanceof Uint8Array ? r.buffer : r;
                return b as ArrayBuffer;
            });
            responseResult = buffers;
            transferList = buffers;
        } else {
            // Handle single result
            const buffer = result instanceof Uint8Array ? result.buffer : (result as ArrayBuffer);
            const castBuffer = buffer as ArrayBuffer;
            responseResult = castBuffer;
            transferList = [castBuffer];
        }

        ctx.postMessage({ id, success: true, result: responseResult }, transferList);
    } catch (error: any) {
        // Always post error back with id so the main thread can correlate responses
        ctx.postMessage({ id, success: false, error: error.message || String(error) });
    }
};
