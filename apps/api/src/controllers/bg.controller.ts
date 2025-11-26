import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BgService } from '../services/bg.service';
import { FileDto } from '../dto/file.dto';
import type { Response } from 'express';

@Controller('bg-remove')
export class BgController {
    constructor(private readonly bgService: BgService) { }

    @Post()
    @UseInterceptors(FileInterceptor('file'))
    async process(@UploadedFile() file: FileDto, @Res() res: Response) {
        if (!file) {
            throw new BadRequestException('File is required');
        }
        const result = await this.bgService.process(file);

        res.set({
            'Content-Type': 'image/png',
            'Content-Disposition': `attachment; filename=bg_removed_${file.originalname.split('.')[0]}.png`,
        });
        res.send(result.data);
    }
}
