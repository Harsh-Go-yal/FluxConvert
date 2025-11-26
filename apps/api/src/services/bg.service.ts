import { Injectable } from '@nestjs/common';
import { BgClient } from '../microservices/bg.client';
import { FileDto } from '../dto/file.dto';

@Injectable()
export class BgService {
    constructor(private readonly bgClient: BgClient) { }

    async process(file: FileDto) {
        const result = await this.bgClient.process(file.buffer, file.originalname);
        return {
            success: true,
            data: result, // This will be binary data usually, controller handles response type
            message: 'Background removal successful',
        };
    }
}
