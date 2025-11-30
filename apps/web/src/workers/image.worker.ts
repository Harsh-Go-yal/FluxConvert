import init, { resize_image, optimize_image } from '@pdf-solutions/wasm';
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
            case 'resize':
                {
                    const { fileBuffer, width, height, unit, maintainAspectRatio, mode, format, quality, background } = payload;
                    const blob = new Blob([fileBuffer]);
                    const bitmap = await createImageBitmap(blob);

                    let targetWidth = width;
                    let targetHeight = height;

                    if (unit === 'percentage') {
                        targetWidth = Math.round(bitmap.width * (width / 100));
                        targetHeight = Math.round(bitmap.height * (height / 100));
                    }

                    // If pixels and maintain aspect ratio was checked in UI, width/height are already calculated.
                    // But if we want to be safe or if logic requires recalculation:
                    // For "stretch", we use targetWidth/Height as is.
                    // For "crop" and "fit", we use targetWidth/Height as the canvas size.

                    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error("Could not get canvas context");

                    // Fill background
                    ctx.fillStyle = background;
                    ctx.fillRect(0, 0, targetWidth, targetHeight);

                    if (mode === 'stretch') {
                        ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
                    } else if (mode === 'crop') {
                        // Cover
                        const scale = Math.max(targetWidth / bitmap.width, targetHeight / bitmap.height);
                        const x = (targetWidth / 2) - (bitmap.width / 2) * scale;
                        const y = (targetHeight / 2) - (bitmap.height / 2) * scale;
                        ctx.drawImage(bitmap, x, y, bitmap.width * scale, bitmap.height * scale);
                    } else if (mode === 'fit') {
                        // Contain
                        const scale = Math.min(targetWidth / bitmap.width, targetHeight / bitmap.height);
                        const x = (targetWidth / 2) - (bitmap.width / 2) * scale;
                        const y = (targetHeight / 2) - (bitmap.height / 2) * scale;
                        ctx.drawImage(bitmap, x, y, bitmap.width * scale, bitmap.height * scale);
                    }

                    // Convert to blob
                    let mimeType = 'image/jpeg';
                    if (format === 'png') mimeType = 'image/png';
                    if (format === 'webp') mimeType = 'image/webp';

                    result = await canvas.convertToBlob({
                        type: mimeType,
                        quality: quality / 100
                    });
                }
                break;
            case 'optimize':
                // payload.fileBuffer is ArrayBuffer
                result = optimize_image(new Uint8Array(payload.fileBuffer));
                break;
            default:
                throw new Error(`Unknown action: ${action}`);
        }

        self.postMessage({ id, success: true, data: result });
    } catch (error: any) {
        self.postMessage({ id, success: false, error: error.message });
    }
};
