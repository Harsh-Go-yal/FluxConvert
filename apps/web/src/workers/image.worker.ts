import init, { resize_image, optimize_image } from '@flux/wasm';

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
            case 'resize':
                // payload.file is Uint8Array, payload.width/height are numbers
                result = resize_image(payload.file, payload.width, payload.height);
                break;
            case 'optimize':
                // payload.file is Uint8Array
                result = optimize_image(payload.file);
                break;
            default:
                throw new Error(`Unknown action: ${action}`);
        }

        self.postMessage({ id, success: true, result });
    } catch (error: any) {
        self.postMessage({ id, success: false, error: error.message });
    }
};
