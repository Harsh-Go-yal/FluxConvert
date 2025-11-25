import { Controller, Post, Body } from '@nestjs/common';
import { QueueService } from './queue.service';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) { }

  @Post('add')
  async addJob(@Body() body: { type: string; data: unknown }) {
    const job = await this.queueService.addJob(body.type, body.data);
    return { jobId: job.id };
  }
}
