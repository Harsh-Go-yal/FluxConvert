import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EnhanceService } from '../services/enhance.service';
import { FileDto } from '../dto/file.dto';
import type { Response } from 'express';

@Controller('enhance')
export class EnhanceController {
    constructor(private readonly enhanceService: EnhanceService) { }

    @Post()
    @UseInterceptors(FileInterceptor('file'))
    async process(@UploadedFile() file: FileDto, @Res() res: Response) {
        if (!file) {
            throw new BadRequestException('File is required');
        }
        const result = await this.enhanceService.process(file);

        // Determine content type based on input or result
        // For simplicity, assuming result matches input type or is PDF/Image
        const isPdf = file.mimetype === 'application/pdf';
        res.set({
            'Content-Type': isPdf ? 'application/pdf' : 'image/jpeg',
            'Content-Disposition': `attachment; filename=enhanced_${file.originalname}`,
        });
        res.send(result.data);
    }
}
