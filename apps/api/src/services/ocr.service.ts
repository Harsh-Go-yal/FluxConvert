import { Injectable } from '@nestjs/common';
import { OcrClient } from '../microservices/ocr.client';
import { FileDto } from '../dto/file.dto';

@Injectable()
export class OcrService {
    constructor(private readonly ocrClient: OcrClient) { }

    async process(file: FileDto) {
        const result = await this.ocrClient.process(file.buffer, file.originalname);
        return {
            success: true,
            data: result,
            message: 'OCR processing successful',
        };
    }
}
