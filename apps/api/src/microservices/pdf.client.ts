import { Injectable } from '@nestjs/common';
import { BaseClient } from './base.client';
import FormData from 'form-data';
import type { AxiosResponse } from 'axios';

@Injectable()
export class PdfClient extends BaseClient {
    constructor() {
        super('http://localhost:8004', 'PdfService');
    }

    async protect(fileBuffer: Buffer, filename: string, password: string) {
        const response = await this.postFile('/protect', fileBuffer, filename, { password });
        return response.data;
    }

    async unlock(fileBuffer: Buffer, filename: string, password: string) {
        const response = await this.postFile('/unlock', fileBuffer, filename, { password });
        return response.data;
    }

    async split(fileBuffer: Buffer, filename: string, start: number, end: number) {
        const response = await this.postFile('/split', fileBuffer, filename, { start, end });
        return response.data;
    }

    async merge(files: Array<{ buffer: Buffer; filename: string }>) {
        const formData = new FormData();
        files.forEach((file) => {
            formData.append('files', file.buffer, { filename: file.filename });
        });

        const response = await this.requestWithRetry<AxiosResponse>(() =>
            this.axiosInstance.post('/merge', formData, {
                headers: { ...formData.getHeaders() },
            })
        );
        return response.data;
    }

    async compress(fileBuffer: Buffer, filename: string) {
        const response = await this.postFile('/compress', fileBuffer, filename);
        return response.data;
    }

    async repair(fileBuffer: Buffer, filename: string) {
        const response = await this.postFile('/repair', fileBuffer, filename);
        return response.data;
    }
}
