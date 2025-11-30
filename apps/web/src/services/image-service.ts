import imageCompression from 'browser-image-compression';

export class ImageService {
    private static worker: Worker | null = null;
    private static messageId = 0;
    private static pending: Map<number, { resolve: (data: any) => void, reject: (err: any) => void }> = new Map();

    private static getWorker() {
        if (typeof window === 'undefined') return null;
        if (!this.worker) {
            this.worker = new Worker(new URL('../workers/image.worker.ts', import.meta.url));
            this.worker.onmessage = (e) => {
                const { id, success, data, error } = e.data;
                const p = this.pending.get(id);
                if (p) {
                    if (success) p.resolve(data);
                    else p.reject(new Error(error));
                    this.pending.delete(id);
                }
            };
            this.worker.onerror = (e) => {
                console.error("Worker error:", e);
            };
        }
        return this.worker;
    }

    private static async send(type: string, payload: any, transfer: Transferable[] = []): Promise<any> {
        const worker = this.getWorker();
        if (!worker) throw new Error("Worker not supported or failed to initialize");

        const id = this.messageId++;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            worker.postMessage({ id, action: type, payload }, transfer);
        });
    }

    static async toFormat(file: File, format: 'png' | 'jpeg' | 'webp'): Promise<Blob> {
        const fileBuffer = await file.arrayBuffer();
        return this.send('toFormat', { fileBuffer, format }, [fileBuffer]);
    }

    static async grayscale(file: File): Promise<Blob> {
        const fileBuffer = await file.arrayBuffer();
        return this.send('applyFilter', { fileBuffer, filter: 'grayscale(100%)' }, [fileBuffer]);
    }

    static async sepia(file: File): Promise<Blob> {
        const fileBuffer = await file.arrayBuffer();
        return this.send('applyFilter', { fileBuffer, filter: 'sepia(100%)' }, [fileBuffer]);
    }

    static async invert(file: File): Promise<Blob> {
        const fileBuffer = await file.arrayBuffer();
        return this.send('applyFilter', { fileBuffer, filter: 'invert(100%)' }, [fileBuffer]);
    }

    static async blur(file: File): Promise<Blob> {
        const fileBuffer = await file.arrayBuffer();
        return this.send('applyFilter', { fileBuffer, filter: 'blur(5px)' }, [fileBuffer]);
    }

    static async brightness(file: File): Promise<Blob> {
        const fileBuffer = await file.arrayBuffer();
        return this.send('applyFilter', { fileBuffer, filter: 'brightness(150%)' }, [fileBuffer]);
    }

    static async contrast(file: File): Promise<Blob> {
        const fileBuffer = await file.arrayBuffer();
        return this.send('applyFilter', { fileBuffer, filter: 'contrast(150%)' }, [fileBuffer]);
    }

    static async sharpen(file: File): Promise<Blob> {
        const fileBuffer = await file.arrayBuffer();
        return this.send('convolution', {
            fileBuffer,
            kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0]
        }, [fileBuffer]);
    }

    static async edge(file: File): Promise<Blob> {
        const fileBuffer = await file.arrayBuffer();
        return this.send('convolution', {
            fileBuffer,
            kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
        }, [fileBuffer]);
    }

    static async pixelate(file: File): Promise<Blob> {
        const fileBuffer = await file.arrayBuffer();
        return this.send('pixelate', { fileBuffer }, [fileBuffer]);
    }

    static async performOCR(file: File, setStatusMessage?: (msg: string) => void): Promise<Blob> {
        if (setStatusMessage) setStatusMessage("Processing OCR in worker...");
        const fileBuffer = await file.arrayBuffer();
        return this.send('ocr', { fileBuffer }, [fileBuffer]);
    }

    static async compress(file: File, options: {
        mode: "percentage" | "target";
        percentage: number;
        targetSize: number;
        targetUnit: "KB" | "MB";
    }): Promise<Blob> {
        let maxSizeMB = 1; // Default
        let maxWidthOrHeight = 1920; // Default
        let useWebWorker = true;

        if (options.mode === "percentage") {
            // Approximate size based on percentage
            // This is tricky because percentage usually refers to quality or dimension reduction
            // browser-image-compression uses maxSizeMB and maxWidthOrHeight
            // We'll use quality reduction if possible, or just reduce dimensions/size

            // For percentage, we can try to map it to a quality score or just reduce the size
            // Since the library focuses on maxSizeMB, let's calculate a target size based on percentage of original
            const originalSizeMB = file.size / 1024 / 1024;
            maxSizeMB = originalSizeMB * (options.percentage / 100);
        } else {
            // Target size
            let targetMB = options.targetSize;
            if (options.targetUnit === "KB") {
                targetMB = targetMB / 1024;
            }
            maxSizeMB = targetMB;
        }

        // Ensure maxSizeMB is at least something small
        if (maxSizeMB < 0.01) maxSizeMB = 0.01;

        console.log(`Compressing to max ${maxSizeMB} MB`);

        try {
            const compressedFile = await imageCompression(file, {
                maxSizeMB,
                maxWidthOrHeight,
                useWebWorker
            });
            return compressedFile;
        } catch (error) {
            console.error("Compression failed:", error);
            throw error;
        }
    }

    static async resize(file: File, options: {
        width: number;
        height: number;
        unit: "pixels" | "percentage";
        maintainAspectRatio: boolean;
        mode: "stretch" | "crop" | "fit";
        dpi: number;
        format: "jpg" | "png" | "webp";
        quality: number;
        background: string;
    }): Promise<Blob> {
        const fileBuffer = await file.arrayBuffer();
        return this.send('resize', {
            fileBuffer,
            ...options
        }, [fileBuffer]);
    }
}
