export class PdfWasmService {
    private static worker: Worker | null = null;
    private static pendingRequests = new Map<string, { resolve: (value: any) => void; reject: (reason?: any) => void }>();

    private static getWorker(): Worker {
        if (!this.worker) {
            this.worker = new Worker(new URL('../../workers/pdf.worker.ts', import.meta.url));
            this.worker.onmessage = (e) => {
                const { id, success, result, error } = e.data;
                const request = this.pendingRequests.get(id);
                if (request) {
                    if (success) {
                        request.resolve(result);
                    } else {
                        request.reject(new Error(error));
                    }
                    this.pendingRequests.delete(id);
                }
            };
        }
        return this.worker;
    }

    private static async runTask(action: string, payload: any): Promise<any> {
        const worker = this.getWorker();
        const id = Math.random().toString(36).substring(7);

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            worker.postMessage({ action, payload, id });
        });
    }

    static async mergePdfs(files: File[]): Promise<Uint8Array> {
        const fileBuffers = await Promise.all(files.map(f => f.arrayBuffer().then(b => new Uint8Array(b))));
        return this.runTask('merge', { files: fileBuffers });
    }

    static async splitPdf(file: File): Promise<Uint8Array[]> {
        const buffer = await file.arrayBuffer();
        return this.runTask('split', { file: new Uint8Array(buffer) });
    }

    static async compressPdf(file: File, quality: number = 50): Promise<Uint8Array> {
        const buffer = await file.arrayBuffer();
        return this.runTask('compress', { file: new Uint8Array(buffer), quality });
    }
}
