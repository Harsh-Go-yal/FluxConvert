/// <reference lib="webworker" />
// image.worker.ts
// Off-main-thread image processing built on OffscreenCanvas.
//
// This worker used to import packages/wasm and only implemented 'resize' and
// 'optimize', so every other action ImageService sends (toFormat, applyFilter,
// convolution, pixelate, ocr) fell through to "Unknown action". It also built
// the source Blob without a MIME type, which made createImageBitmap fail with
// "The source image could not be decoded." Both are fixed here, and the
// unfinished WASM dependency is gone.

const ctx = self as unknown as DedicatedWorkerGlobalScope;

type Action = 'resize' | 'toFormat' | 'applyFilter' | 'convolution' | 'pixelate' | 'optimize' | 'ocr';

interface WorkerMessage {
    id: number;
    action: Action;
    payload: Record<string, unknown>;
}

function mimeFor(format?: string): string {
    if (format === 'png') return 'image/png';
    if (format === 'webp') return 'image/webp';
    if (format === 'jpg' || format === 'jpeg') return 'image/jpeg';
    return 'image/png';
}

/** Decode the incoming bytes. The MIME type matters: without it decoding can fail. */
async function decode(payload: Record<string, unknown>): Promise<ImageBitmap> {
    const buffer = payload.fileBuffer as ArrayBuffer;
    if (!buffer || (buffer as ArrayBuffer).byteLength === 0) {
        throw new Error('The image file is empty.');
    }
    const type = (payload.fileType as string) || sniff(new Uint8Array(buffer));
    try {
        return await createImageBitmap(new Blob([buffer], { type }));
    } catch {
        throw new Error('This image could not be read. Try a PNG, JPEG or WebP file.');
    }
}

/** Detect a MIME type from magic bytes when the caller did not supply one. */
function sniff(bytes: Uint8Array): string {
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
    if (bytes[0] === 0x47 && bytes[1] === 0x49) return 'image/gif';
    if (bytes[8] === 0x57 && bytes[9] === 0x45) return 'image/webp';
    return 'image/png';
}

function canvasFor(width: number, height: number) {
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create a drawing surface for this image.');
    return { canvas, context };
}

function toBlob(canvas: OffscreenCanvas, type: string, quality?: number) {
    return canvas.convertToBlob(
        type === 'image/png' ? { type } : { type, quality: quality ?? 0.92 },
    );
}

async function resize(payload: Record<string, unknown>): Promise<Blob> {
    const {
        width = 100,
        height = 100,
        unit = 'percentage',
        mode = 'stretch',
        format = 'jpg',
        quality = 90,
        background = '#ffffff',
    } = payload as Record<string, never> & {
        width: number; height: number; unit: string; mode: string;
        format: string; quality: number; background: string;
    };

    const bitmap = await decode(payload);
    let targetWidth = Number(width);
    let targetHeight = Number(height);
    if (unit === 'percentage') {
        targetWidth = Math.round(bitmap.width * (Number(width) / 100));
        targetHeight = Math.round(bitmap.height * (Number(height) / 100));
    }
    if (!Number.isFinite(targetWidth) || targetWidth <= 0) targetWidth = bitmap.width;
    if (!Number.isFinite(targetHeight) || targetHeight <= 0) targetHeight = bitmap.height;

    const { canvas, context } = canvasFor(targetWidth, targetHeight);
    const mime = mimeFor(String(format));
    if (mime === 'image/jpeg') {
        context.fillStyle = String(background) || '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (mode === 'stretch') {
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    } else {
        // 'fit' letterboxes the whole image, 'crop' fills the frame and overflows.
        const scale =
            mode === 'crop'
                ? Math.max(canvas.width / bitmap.width, canvas.height / bitmap.height)
                : Math.min(canvas.width / bitmap.width, canvas.height / bitmap.height);
        const drawWidth = bitmap.width * scale;
        const drawHeight = bitmap.height * scale;
        context.drawImage(
            bitmap,
            canvas.width / 2 - drawWidth / 2,
            canvas.height / 2 - drawHeight / 2,
            drawWidth,
            drawHeight,
        );
    }
    bitmap.close();
    return toBlob(canvas, mime, Number(quality) / 100);
}

async function drawWhole(payload: Record<string, unknown>, filter?: string) {
    const bitmap = await decode(payload);
    const { canvas, context } = canvasFor(bitmap.width, bitmap.height);
    if (filter) context.filter = filter;
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    return { canvas, context };
}

/** 3x3 convolution (sharpen / edge detect). */
async function convolution(payload: Record<string, unknown>): Promise<Blob> {
    const kernel = (payload.kernel as number[]) ?? [0, 0, 0, 0, 1, 0, 0, 0, 0];
    const { canvas, context } = await drawWhole(payload);
    const { width, height } = canvas;
    const source = context.getImageData(0, 0, width, height);
    const output = context.createImageData(width, height);
    const side = Math.round(Math.sqrt(kernel.length));
    const half = Math.floor(side / 2);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0;
            for (let ky = 0; ky < side; ky++) {
                for (let kx = 0; kx < side; kx++) {
                    const sy = Math.min(height - 1, Math.max(0, y + ky - half));
                    const sx = Math.min(width - 1, Math.max(0, x + kx - half));
                    const offset = (sy * width + sx) * 4;
                    const weight = kernel[ky * side + kx];
                    r += source.data[offset] * weight;
                    g += source.data[offset + 1] * weight;
                    b += source.data[offset + 2] * weight;
                }
            }
            const target = (y * width + x) * 4;
            output.data[target] = Math.min(255, Math.max(0, r));
            output.data[target + 1] = Math.min(255, Math.max(0, g));
            output.data[target + 2] = Math.min(255, Math.max(0, b));
            output.data[target + 3] = source.data[target + 3];
        }
    }
    context.putImageData(output, 0, 0);
    return toBlob(canvas, 'image/png');
}

/** Pixelate by downscaling then scaling back up with smoothing off. */
async function pixelate(payload: Record<string, unknown>): Promise<Blob> {
    const bitmap = await decode(payload);
    const blockSize = Number(payload.blockSize) > 0 ? Number(payload.blockSize) : 12;
    const smallWidth = Math.max(1, Math.round(bitmap.width / blockSize));
    const smallHeight = Math.max(1, Math.round(bitmap.height / blockSize));

    const small = canvasFor(smallWidth, smallHeight);
    small.context.drawImage(bitmap, 0, 0, smallWidth, smallHeight);

    const { canvas, context } = canvasFor(bitmap.width, bitmap.height);
    context.imageSmoothingEnabled = false;
    context.drawImage(small.canvas, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return toBlob(canvas, 'image/png');
}

ctx.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { action, payload, id } = event.data;
    try {
        let result: Blob;
        switch (action) {
            case 'resize':
                result = await resize(payload);
                break;
            case 'toFormat': {
                const format = String(payload.format ?? 'png');
                const { canvas } = await drawWhole(payload);
                result = await toBlob(canvas, mimeFor(format), 0.92);
                break;
            }
            case 'applyFilter': {
                const { canvas } = await drawWhole(payload, String(payload.filter ?? 'none'));
                result = await toBlob(canvas, 'image/jpeg', 0.92);
                break;
            }
            case 'convolution':
                result = await convolution(payload);
                break;
            case 'pixelate':
                result = await pixelate(payload);
                break;
            case 'optimize': {
                // Re-encode as WebP, which is materially smaller than PNG/JPEG for most images.
                const { canvas } = await drawWhole(payload);
                result = await toBlob(canvas, 'image/webp', 0.8);
                break;
            }
            case 'ocr': {
                const { default: Tesseract } = await import('tesseract.js');
                const buffer = payload.fileBuffer as ArrayBuffer;
                const type = (payload.fileType as string) || sniff(new Uint8Array(buffer));
                const { data } = await Tesseract.recognize(new Blob([buffer], { type }), 'eng');
                const text = data.text.trim();
                if (!text) throw new Error('No readable text was found in this image.');
                result = new Blob([text], { type: 'text/plain;charset=utf-8' });
                break;
            }
            default:
                throw new Error(`This image tool is not available yet (${action}).`);
        }
        ctx.postMessage({ id, success: true, data: result });
    } catch (error: unknown) {
        ctx.postMessage({
            id,
            success: false,
            error: error instanceof Error ? error.message : 'Image processing failed.',
        });
    }
};

export {};
