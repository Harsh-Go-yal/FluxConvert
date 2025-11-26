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
            worker.postMessage({ id, type, payload }, transfer);
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
}
