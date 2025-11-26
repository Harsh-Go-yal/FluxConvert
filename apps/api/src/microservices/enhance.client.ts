import { Injectable } from '@nestjs/common';
import { BaseClient } from './base.client';

@Injectable()
export class EnhanceClient extends BaseClient {
    constructor() {
        super('http://localhost:8003', 'EnhanceService');
    }

    async process(fileBuffer: Buffer, filename: string) {
        const response = await this.postFile('/process', fileBuffer, filename);
        return response.data;
    }
}
