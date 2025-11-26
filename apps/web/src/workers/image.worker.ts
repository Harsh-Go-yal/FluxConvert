import Tesseract from 'tesseract.js';

const applyConvolution = (ctx: OffscreenCanvasRenderingContext2D, canvas: OffscreenCanvas, kernel: number[]) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const side = Math.round(Math.sqrt(kernel.length));
    const halfSide = Math.floor(side / 2);
    const src = data;
    const w = canvas.width;
    const h = canvas.height;
    const output = ctx.createImageData(w, h);
    const dst = output.data;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let r = 0, g = 0, b = 0;
            for (let cy = 0; cy < side; cy++) {
                for (let cx = 0; cx < side; cx++) {
                    const scy = y + cy - halfSide;
                    const scx = x + cx - halfSide;
                    if (scy >= 0 && scy < h && scx >= 0 && scx < w) {
                        const srcOff = (scy * w + scx) * 4;
                        const wt = kernel[cy * side + cx];
                        r += src[srcOff] * wt;
                        g += src[srcOff + 1] * wt;
                        b += src[srcOff + 2] * wt;
                    }
                }
            }
            const dstOff = (y * w + x) * 4;
            dst[dstOff] = r;
            dst[dstOff + 1] = g;
            dst[dstOff + 2] = b;
            dst[dstOff + 3] = src[(y * w + x) * 4 + 3];
        }
    }
    ctx.putImageData(output, 0, 0);
};

const processImage = async (fileBuffer: ArrayBuffer, processFn: (ctx: OffscreenCanvasRenderingContext2D, canvas: OffscreenCanvas) => void, outputType: string = 'image/jpeg', quality: number = 0.9) => {
    if (typeof OffscreenCanvas === 'undefined') {
        throw new Error("OffscreenCanvas not supported");
    }
    const blob = new Blob([fileBuffer]);
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas context not available");

    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    ctx.drawImage(bitmap, 0, 0);

    processFn(ctx, canvas);

    const resultBlob = await canvas.convertToBlob({ type: outputType, quality });
    return resultBlob; // Blob is not transferable, but postMessage handles it. Or we can send ArrayBuffer.
    // Sending Blob is fine.
};

const handlers: Record<string, (payload: any) => Promise<any>> = {
    async toFormat({ fileBuffer, format }) {
        const type = `image/${format}`;
        return await processImage(fileBuffer, () => { }, type);
    },

    async filter({ fileBuffer, filterType }) {
        return await processImage(fileBuffer, (ctx) => {
            ctx.filter = filterType;
            // We need to redraw the image with the filter?
            // ctx.filter applies to *subsequent* drawing operations.
            // So we need to draw the image *after* setting the filter.
            // But processImage already draws it at the start.
            // So we need to clear and redraw, or just set filter before drawing.
            // Let's modify processImage to allow "pre-draw" setup or just handle it here.
            // Actually, ctx.filter affects drawImage.
            // So if processImage draws it, we need to set filter BEFORE that.
            // But processImage is generic.
            // Let's change processImage to NOT draw immediately, or take a "draw" callback.
            // Or just redraw it.
            // Since we already drew it, we can't just apply filter to existing pixels easily without redrawing.
            // So:
            // 1. Set filter.
            // 2. Draw image again (we need the bitmap).
            // But we don't have the bitmap in the callback scope easily unless we pass it.
        });
    },

    // Let's refactor processImage to be more flexible or just implement handlers directly.
    // Implementing directly is safer.

    async applyFilter({ fileBuffer, filter }) {
        const blob = new Blob([fileBuffer]);
        const bitmap = await createImageBitmap(blob);
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Context error");

        ctx.filter = filter;
        ctx.drawImage(bitmap, 0, 0);

        return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
    },

    async convolution({ fileBuffer, kernel }) {
        const blob = new Blob([fileBuffer]);
        const bitmap = await createImageBitmap(blob);
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Context error");

        ctx.drawImage(bitmap, 0, 0);
        applyConvolution(ctx, canvas, kernel);

        return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
    },

    async pixelate({ fileBuffer }) {
        const blob = new Blob([fileBuffer]);
        const bitmap = await createImageBitmap(blob);
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Context error");

        const size = 10;
        const w = canvas.width;
        const h = canvas.height;

        ctx.drawImage(bitmap, 0, 0, w / size, h / size);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(canvas, 0, 0, w / size, h / size, 0, 0, w, h);

        return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
    },

    async ocr({ fileBuffer }) {
        const blob = new Blob([fileBuffer]);
        const worker = await Tesseract.createWorker('eng');
        const ret = await worker.recognize(blob);
        await worker.terminate();
        return new Blob([ret.data.text], { type: 'text/plain' });
    }
};

self.onmessage = async (e: MessageEvent) => {
    const { id, type, payload } = e.data;
    if (handlers[type]) {
        try {
            const result = await handlers[type](payload);
            self.postMessage({ id, success: true, data: result });
        } catch (error: any) {
            self.postMessage({ id, success: false, error: error.message || String(error) });
        }
    } else {
        self.postMessage({ id, success: false, error: `Unknown message type: ${type}` });
    }
};
