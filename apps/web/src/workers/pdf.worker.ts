import init, { merge_pdfs, split_pdf, compress_pdf } from '@pdf-solutions/wasm';
import wasmUrl from '@pdf-solutions/wasm/flux_wasm_bg.wasm';

let isInitialized = false;

async function initializeWasm() {
    if (!isInitialized) {
        const fullUrl = new URL(wasmUrl, self.location.origin).href;
        await init(fullUrl);
        isInitialized = true;
    }
}

self.onmessage = async (e: MessageEvent) => {
    const { action, payload, id } = e.data;

    try {
        await initializeWasm();
        let result;

        switch (action) {
            case 'merge':
                // payload.fileBuffers is Array<ArrayBuffer>, convert to Uint8Array[]
                result = merge_pdfs(payload.fileBuffers.map((b: ArrayBuffer) => new Uint8Array(b)));
                break;
            case 'split':
                // payload.fileBuffer is ArrayBuffer, convert to Uint8Array
                result = split_pdf(new Uint8Array(payload.fileBuffer));
                break;
            case 'compress':
                // payload.fileBuffer is ArrayBuffer, convert to Uint8Array
                result = compress_pdf(new Uint8Array(payload.fileBuffer), payload.quality || 50);
                break;
            default:
                throw new Error(`Unknown action: ${action}`);
        }

        self.postMessage({ id, success: true, result });
    } catch (error: any) {
        self.postMessage({ id, success: false, error: error.message });
    }
};
