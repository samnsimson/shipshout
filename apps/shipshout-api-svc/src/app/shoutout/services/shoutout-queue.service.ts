import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ShoutoutQueueUtils } from '../utils/shoutout-queue.utils';

@Injectable()
export class ShoutoutQueueService {
    constructor(
        @InjectQueue('shoutout-generation') private readonly generationQueue: Queue,
        @InjectQueue('shoutout-dispatch') private readonly dispatchQueue: Queue,
    ) {}

    async addGenerationJob(payload: { shoutoutId: string }, options?: { replace?: boolean }): Promise<void> {
        const jobId = ShoutoutQueueUtils.generationJobId(payload.shoutoutId);
        await this.removeExistingJob(this.generationQueue, jobId, options?.replace ?? false);
        await this.generationQueue.add('generate', payload, {
            jobId,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
        });
    }

    async addDispatchJob(payload: { shoutoutId: string }, options?: { replace?: boolean }): Promise<void> {
        const jobId = ShoutoutQueueUtils.dispatchJobId(payload.shoutoutId);
        await this.removeExistingJob(this.dispatchQueue, jobId, options?.replace ?? false);
        await this.dispatchQueue.add('dispatch', payload, {
            jobId,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
        });
    }

    private async removeExistingJob(queue: Queue, jobId: string, replace: boolean): Promise<void> {
        const existing = await queue.getJob(jobId);
        if (!existing) return;

        if (replace) {
            await existing.remove();
            return;
        }

        const state = await existing.getState();
        if (state === 'completed' || state === 'failed') await existing.remove();
    }
}
