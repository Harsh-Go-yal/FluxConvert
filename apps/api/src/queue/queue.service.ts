import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService {
  constructor(@InjectQueue('file-processing') private fileQueue: Queue) { }

  async addJob(type: string, data: unknown) {
    return await this.fileQueue.add(type, data);
  }
}
