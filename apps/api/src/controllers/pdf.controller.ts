import { Controller, Post, UseInterceptors, UploadedFile, UploadedFiles, Body, BadRequestException, Res } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { PdfService } from '../services/pdf.service';
import { FileDto, ProtectDto, UnlockDto, SplitDto } from '../dto/file.dto';
import type { Response } from 'express';

@Controller('pdf')
export class PdfController {
    constructor(private readonly pdfService: PdfService) { }

    @Post('protect')
    @UseInterceptors(FileInterceptor('file'))
    async protect(@UploadedFile() file: FileDto, @Body() dto: ProtectDto, @Res() res: Response) {
        if (!file) throw new BadRequestException('File is required');
        const result = await this.pdfService.protect(file, dto);
        this.sendPdfResponse(res, result.data, `protected_${file.originalname}`);
    }

    @Post('unlock')
    @UseInterceptors(FileInterceptor('file'))
    async unlock(@UploadedFile() file: FileDto, @Body() dto: UnlockDto, @Res() res: Response) {
        if (!file) throw new BadRequestException('File is required');
        const result = await this.pdfService.unlock(file, dto);
        this.sendPdfResponse(res, result.data, `unlocked_${file.originalname}`);
    }

    @Post('split')
    @UseInterceptors(FileInterceptor('file'))
    async split(@UploadedFile() file: FileDto, @Body() dto: SplitDto, @Res() res: Response) {
        if (!file) throw new BadRequestException('File is required');
        const result = await this.pdfService.split(file, dto);
        this.sendPdfResponse(res, result.data, `split_${file.originalname}`);
    }

    @Post('merge')
    @UseInterceptors(FilesInterceptor('files'))
    async merge(@UploadedFiles() files: Array<FileDto>, @Res() res: Response) {
        if (!files || files.length === 0) throw new BadRequestException('Files are required');
        const result = await this.pdfService.merge(files);
        this.sendPdfResponse(res, result.data, 'merged.pdf');
    }

    @Post('compress')
    @UseInterceptors(FileInterceptor('file'))
    async compress(@UploadedFile() file: FileDto, @Res() res: Response) {
        if (!file) throw new BadRequestException('File is required');
        const result = await this.pdfService.compress(file);
        this.sendPdfResponse(res, result.data, `compressed_${file.originalname}`);
    }

    @Post('repair')
    @UseInterceptors(FileInterceptor('file'))
    async repair(@UploadedFile() file: FileDto, @Res() res: Response) {
        if (!file) throw new BadRequestException('File is required');
        const result = await this.pdfService.repair(file);
        this.sendPdfResponse(res, result.data, `repaired_${file.originalname}`);
    }

    private sendPdfResponse(res: Response, data: any, filename: string) {
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=${filename}`,
        });
        res.send(data);
    }
}
