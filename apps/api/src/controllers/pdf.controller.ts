import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    UploadedFiles,
    Body,
    BadRequestException,
    Res
} from '@nestjs/common';

import {
    FileInterceptor,
    FilesInterceptor
} from '@nestjs/platform-express';

import { PdfService } from '../services/pdf.service';
import {
    FileDto,
    ProtectDto,
    UnlockDto,
    SplitDto
} from '../dto/file.dto';

import type { Response } from 'express';

@Controller('pdf')
export class PdfController {
    constructor(private readonly pdfService: PdfService) { }

    // ---------------------------------------------------------
    // PROTECT
    // ---------------------------------------------------------
    @Post('protect')
    @UseInterceptors(FileInterceptor('file'))
    async protect(
        @UploadedFile() file: FileDto,
        @Body() dto: ProtectDto,
        @Res() res: Response
    ) {
        if (!file) throw new BadRequestException('File is required');

        const pdfBuffer = await this.pdfService.protect(file, dto);

        this.sendPdfResponse(
            res,
            pdfBuffer,
            `protected_${file.originalname}`
        );
    }

    // ---------------------------------------------------------
    // UNLOCK
    // ---------------------------------------------------------
    @Post('unlock')
    @UseInterceptors(FileInterceptor('file'))
    async unlock(
        @UploadedFile() file: FileDto,
        @Body() dto: UnlockDto,
        @Res() res: Response
    ) {
        if (!file) throw new BadRequestException('File is required');

        const pdfBuffer = await this.pdfService.unlock(file, dto);

        this.sendPdfResponse(
            res,
            pdfBuffer,
            `unlocked_${file.originalname}`
        );
    }

    // ---------------------------------------------------------
    // SPLIT
    // ---------------------------------------------------------
    @Post('split')
    @UseInterceptors(FileInterceptor('file'))
    async split(
        @UploadedFile() file: FileDto,
        @Body() dto: SplitDto,
        @Res() res: Response
    ) {
        if (!file) throw new BadRequestException('File is required');

        const pdfBuffer = await this.pdfService.split(file, dto);

        this.sendPdfResponse(
            res,
            pdfBuffer,
            `split_${file.originalname}`
        );
    }

    // ---------------------------------------------------------
    // MERGE
    // ---------------------------------------------------------
    @Post('merge')
    @UseInterceptors(FilesInterceptor('files'))
    async merge(
        @UploadedFiles() files: Array<FileDto>,
        @Res() res: Response
    ) {
        if (!files || files.length === 0)
            throw new BadRequestException('Files are required');

        const pdfBuffer = await this.pdfService.merge(files);

        this.sendPdfResponse(
            res,
            pdfBuffer,
            'merged.pdf'
        );
    }

    // ---------------------------------------------------------
    // COMPRESS
    // ---------------------------------------------------------
    @Post('compress')
    @UseInterceptors(FileInterceptor('file'))
    async compress(
        @UploadedFile() file: FileDto,
        @Res() res: Response
    ) {
        if (!file) throw new BadRequestException('File is required');

        const pdfBuffer = await this.pdfService.compress(file);

        this.sendPdfResponse(
            res,
            pdfBuffer,
            `compressed_${file.originalname}`
        );
    }

    // ---------------------------------------------------------
    // REPAIR
    // ---------------------------------------------------------
    @Post('repair')
    @UseInterceptors(FileInterceptor('file'))
    async repair(
        @UploadedFile() file: FileDto,
        @Res() res: Response
    ) {
        if (!file) throw new BadRequestException('File is required');

        const pdfBuffer = await this.pdfService.repair(file);

        this.sendPdfResponse(
            res,
            pdfBuffer,
            `repaired_${file.originalname}`
        );
    }

    // ---------------------------------------------------------
    // SEND PDF RESPONSE (MAIN FIX)
    // ---------------------------------------------------------
    private sendPdfResponse(res: Response, buffer: Buffer, filename: string) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${filename}"`
        );
        res.setHeader('Content-Length', buffer.length.toString());

        // ❗ MUST use res.end(), NOT res.send()
        // res.send() converts buffer → string → CORRUPTION → white PDF
        return res.end(buffer);
    }
}
