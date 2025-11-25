import { Controller, Post, UploadedFile, UseInterceptors, Res, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Controller('convert')
export class ConvertController {
    @Post('pptx-to-pdf')
    @UseInterceptors(FileInterceptor('file'))
    async convertPptxToPdf(@UploadedFile() file: Express.Multer.File, @Res() res: Response) {
        if (!file) {
            throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
        }

        const tmpDir = os.tmpdir();
        const inputFilePath = path.join(tmpDir, `${Date.now()}_${file.originalname}`);
        const outputDir = tmpDir;
        const outputFileName = `${path.parse(inputFilePath).name}.pdf`;
        const outputFilePath = path.join(outputDir, outputFileName);

        try {
            // Write uploaded buffer to temp file
            await fs.promises.writeFile(inputFilePath, file.buffer);

            // Execute LibreOffice conversion
            // --headless: no UI
            // --convert-to pdf: target format
            // --outdir: output directory
            const command = `libreoffice --headless --convert-to pdf --outdir "${outputDir}" "${inputFilePath}"`;

            console.log(`Executing: ${command}`);
            await execAsync(command);

            if (!fs.existsSync(outputFilePath)) {
                throw new Error('Conversion failed: Output file not created');
            }

            // Stream the file back to the client
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${path.parse(file.originalname).name}.pdf"`);

            const fileStream = fs.createReadStream(outputFilePath);
            fileStream.pipe(res);

            // Cleanup temp files after sending
            fileStream.on('close', async () => {
                try {
                    if (fs.existsSync(inputFilePath)) await fs.promises.unlink(inputFilePath);
                    if (fs.existsSync(outputFilePath)) await fs.promises.unlink(outputFilePath);
                } catch (cleanupErr) {
                    console.error('Cleanup error:', cleanupErr);
                }
            });

        } catch (error) {
            console.error('Conversion error:', error);
            // Cleanup on error
            if (fs.existsSync(inputFilePath)) await fs.promises.unlink(inputFilePath).catch(() => { });
            if (fs.existsSync(outputFilePath)) await fs.promises.unlink(outputFilePath).catch(() => { });

            throw new HttpException('Conversion failed', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
