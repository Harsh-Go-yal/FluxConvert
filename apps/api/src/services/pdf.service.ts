import { Injectable } from '@nestjs/common';
import { PdfClient } from '../microservices/pdf.client';
import {
    FileDto,
    ProtectDto,
    UnlockDto,
    SplitDto
} from '../dto/file.dto';

@Injectable()
export class PdfService {
    constructor(private readonly pdfClient: PdfClient) { }

    // ---------------------------------------------------------
    // PROTECT
    // ---------------------------------------------------------
    async protect(file: FileDto, dto: ProtectDto): Promise<Buffer> {
        return await this.pdfClient.protect(
            file.buffer,
            file.originalname,
            dto.password
        );
    }

    // ---------------------------------------------------------
    // UNLOCK
    // ---------------------------------------------------------
    async unlock(file: FileDto, dto: UnlockDto): Promise<Buffer> {
        return await this.pdfClient.unlock(
            file.buffer,
            file.originalname,
            dto.password
        );
    }

    // ---------------------------------------------------------
    // SPLIT
    // ---------------------------------------------------------
    async split(file: FileDto, dto: SplitDto): Promise<Buffer> {
        return await this.pdfClient.split(
            file.buffer,
            file.originalname,
            dto.start,
            dto.end
        );
    }

    // ---------------------------------------------------------
    // MERGE
    // ---------------------------------------------------------
    async merge(files: Array<FileDto>): Promise<Buffer> {
        const fileData = files.map(f => ({
            buffer: f.buffer,
            filename: f.originalname
        }));

        return await this.pdfClient.merge(fileData);
    }

    // ---------------------------------------------------------
    // COMPRESS
    // ---------------------------------------------------------
    async compress(file: FileDto): Promise<Buffer> {
        return await this.pdfClient.compress(
            file.buffer,
            file.originalname
        );
    }

    // ---------------------------------------------------------
    // REPAIR
    // ---------------------------------------------------------
    async repair(file: FileDto): Promise<Buffer> {
        return await this.pdfClient.repair(
            file.buffer,
            file.originalname
        );
    }
}
