import { Injectable } from '@nestjs/common';
import { BaseClient } from './base.client';

@Injectable()
export class BgClient extends BaseClient {
    constructor() {
        super(process.env.BG_REMOVE_URL || 'http://localhost:8002', 'BgRemoveService');
    }

    async process(fileBuffer: Buffer, filename: string) {
        const response = await this.postFile('/process', fileBuffer, filename);
        return response.data;
    }
}
