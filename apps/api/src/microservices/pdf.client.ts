import { Injectable } from '@nestjs/common';
import { BaseClient } from './base.client';
import FormData = require('form-data');
import type { AxiosResponse } from 'axios';

@Injectable()
export class PdfClient extends BaseClient {
    constructor() {
        super(process.env.PDF_SERVICE_URL || 'http://localhost:8004', 'PdfService');
    }

    // -------------------------------
    // ✔ PROTECT PDF
    // -------------------------------
    async protect(fileBuffer: Buffer, filename: string, password: string) {
        const response = await this.postFile(
            "/protect",
            fileBuffer,
            filename,
            { password }
        );

        return Buffer.from(response.data);  // 👈 raw binary buffer
    }

    // -------------------------------
    // ✔ UNLOCK PDF
    // -------------------------------
    async unlock(fileBuffer: Buffer, filename: string, password: string) {
        const response = await this.postFile(
            '/unlock',
            fileBuffer,
            filename,
            { password }
        );

        return Buffer.from(response.data);
    }

    // -------------------------------
    // ✔ SPLIT PDF
    // -------------------------------
    async split(fileBuffer: Buffer, filename: string, start: number, end: number) {
        const response = await this.postFile(
            '/split',
            fileBuffer,
            filename,
            { start, end }
        );

        return Buffer.from(response.data);
    }

    // -------------------------------
    // ✔ MERGE MULTIPLE PDFs
    // -------------------------------
    async merge(files: Array<{ buffer: Buffer; filename: string }>) {
        const formData = new FormData();

        files.forEach((file) => {
            formData.append('files', file.buffer, { filename: file.filename });
        });

        const response = await this.requestWithRetry<AxiosResponse>(() =>
            this.axiosInstance.post('/merge', formData, {
                headers: { ...formData.getHeaders() },
                responseType: "arraybuffer",   // 👈 IMPORTANT
            })
        );

        return Buffer.from(response.data);
    }

    // -------------------------------
    // ✔ COMPRESS PDF
    // -------------------------------
    async compress(fileBuffer: Buffer, filename: string) {
        const response = await this.postFile('/compress', fileBuffer, filename);
        return Buffer.from(response.data);
    }

    // -------------------------------
    // ✔ REPAIR PDF
    // -------------------------------
    async repair(fileBuffer: Buffer, filename: string) {
        const response = await this.postFile('/repair', fileBuffer, filename);
        return Buffer.from(response.data);
    }
}
