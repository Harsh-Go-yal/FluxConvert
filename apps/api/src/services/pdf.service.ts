import { Injectable } from '@nestjs/common';
import { PdfClient } from '../microservices/pdf.client';
import { FileDto, ProtectDto, UnlockDto, SplitDto } from '../dto/file.dto';

@Injectable()
export class PdfService {
    constructor(private readonly pdfClient: PdfClient) { }

    async protect(file: FileDto, dto: ProtectDto) {
        const result = await this.pdfClient.protect(file.buffer, file.originalname, dto.password);
        return { success: true, data: result };
    }

    async unlock(file: FileDto, dto: UnlockDto) {
        const result = await this.pdfClient.unlock(file.buffer, file.originalname, dto.password);
        return { success: true, data: result };
    }

    async split(file: FileDto, dto: SplitDto) {
        const result = await this.pdfClient.split(file.buffer, file.originalname, dto.start, dto.end);
        return { success: true, data: result };
    }

    async merge(files: Array<FileDto>) {
        const filesData = files.map(f => ({ buffer: f.buffer, filename: f.originalname }));
        const result = await this.pdfClient.merge(filesData);
        return { success: true, data: result };
    }

    async compress(file: FileDto) {
        const result = await this.pdfClient.compress(file.buffer, file.originalname);
        return { success: true, data: result };
    }

    async repair(file: FileDto) {
        const result = await this.pdfClient.repair(file.buffer, file.originalname);
        return { success: true, data: result };
    }
}
