import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { ShoutoutRepository } from '../repositories/shoutout.repository';
import { ShoutoutEventsService } from '../services/shoutout-events.service';
import { ShoutoutGenerationService } from '../services/shoutout-generation.service';

@Injectable()
@Processor('shoutout-generation')
export class ShoutoutGenerationProcessor extends WorkerHost {
    constructor(
        private readonly generationService: ShoutoutGenerationService,
        private readonly shoutouts: ShoutoutRepository,
        private readonly events: ShoutoutEventsService,
    ) {
        super();
    }

    async process(job: Job<{ shoutoutId: string }>): Promise<void> {
        await this.generationService.run(job.data.shoutoutId);
    }

    @OnWorkerEvent('failed')
    async onFailed(job: Job<{ shoutoutId: string }>): Promise<void> {
        const maxAttempts = job.opts.attempts ?? 1;
        if (job.attemptsMade < maxAttempts) return;

        const shoutout = await this.shoutouts.findById(job.data.shoutoutId);
        if (!shoutout || shoutout.status !== 'generating') return;

        await this.shoutouts.save({ ...shoutout, status: 'generation_failed' });
        await this.events.publish(job.data.shoutoutId, { status: 'generation_failed' });
    }
}
