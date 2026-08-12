import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class ShoutoutQueueService {
    constructor(@InjectQueue('shoutout-generation') private readonly generationQueue: Queue) {}

    async addGenerationJob(payload: { shoutoutId: string }): Promise<void> {
        await this.generationQueue.add('generate', payload, {
            jobId: `gen-${payload.shoutoutId}`,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
        });
    }
}
