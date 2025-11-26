import { Injectable } from '@nestjs/common';
import { EnhanceClient } from '../microservices/enhance.client';
import { FileDto } from '../dto/file.dto';

@Injectable()
export class EnhanceService {
    constructor(private readonly enhanceClient: EnhanceClient) { }

    async process(file: FileDto) {
        const result = await this.enhanceClient.process(file.buffer, file.originalname);
        return {
            success: true,
            data: result,
            message: 'Enhancement successful',
        };
    }
}
