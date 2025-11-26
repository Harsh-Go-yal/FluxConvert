import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OcrService } from '../services/ocr.service';
import { FileDto } from '../dto/file.dto';

@Controller('ocr')
export class OcrController {
    constructor(private readonly ocrService: OcrService) { }

    @Post()
    @UseInterceptors(FileInterceptor('file'))
    async process(@UploadedFile() file: FileDto) {
        if (!file) {
            throw new BadRequestException('File is required');
        }
        return this.ocrService.process(file);
    }
}
