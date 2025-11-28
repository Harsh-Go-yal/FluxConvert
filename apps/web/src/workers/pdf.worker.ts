import init, { merge_pdfs, split_pdf, compress_pdf } from '@flux/wasm';

let isInitialized = false;

async function initializeWasm() {
    if (!isInitialized) {
        await init();
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
                // payload.files is Array<Uint8Array>
                result = merge_pdfs(payload.files);
                break;
            case 'split':
                // payload.file is Uint8Array
                result = split_pdf(payload.file);
                break;
            case 'compress':
                // payload.file is Uint8Array, payload.quality is number
                result = compress_pdf(payload.file, payload.quality || 50);
                break;
            default:
                throw new Error(`Unknown action: ${action}`);
        }

        self.postMessage({ id, success: true, result });
    } catch (error: any) {
        self.postMessage({ id, success: false, error: error.message });
    }
};
