import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class ShoutoutQueueService {
    constructor(
        @InjectQueue('shoutout-generation') private readonly generationQueue: Queue,
        @InjectQueue('shoutout-dispatch') private readonly dispatchQueue: Queue,
    ) {}

    async addGenerationJob(payload: { shoutoutId: string }): Promise<void> {
        await this.generationQueue.add('generate', payload, {
            jobId: `gen-${payload.shoutoutId}`,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
        });
    }

    async addDispatchJob(payload: { shoutoutId: string }): Promise<void> {
        await this.dispatchQueue.add('dispatch', payload, {
            jobId: `dispatch-${payload.shoutoutId}`,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
        });
    }
}
