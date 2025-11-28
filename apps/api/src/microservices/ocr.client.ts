import { Injectable } from '@nestjs/common';
import { BaseClient } from './base.client';

@Injectable()
export class OcrClient extends BaseClient {
    constructor() {
        super(process.env.OCR_SERVICE_URL || 'http://localhost:8001', 'OcrService');
    }

    async process(fileBuffer: Buffer, filename: string) {
        const response = await this.postFile('/process', fileBuffer, filename);
        return response.data;
    }
}
