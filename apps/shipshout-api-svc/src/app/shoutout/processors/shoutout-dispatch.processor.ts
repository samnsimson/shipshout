import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { ShoutoutRepository } from '../repositories/shoutout.repository';
import { ShoutoutDispatchService } from '../services/shoutout-dispatch.service';
import { ShoutoutEventsService } from '../services/shoutout-events.service';

@Injectable()
@Processor('shoutout-dispatch')
export class ShoutoutDispatchProcessor extends WorkerHost {
    constructor(
        private readonly dispatchService: ShoutoutDispatchService,
        private readonly shoutouts: ShoutoutRepository,
        private readonly events: ShoutoutEventsService,
    ) {
        super();
    }

    async process(job: Job<{ shoutoutId: string }>): Promise<void> {
        await this.dispatchService.run(job.data.shoutoutId);
    }

    @OnWorkerEvent('failed')
    async onFailed(job: Job<{ shoutoutId: string }>): Promise<void> {
        const maxAttempts = job.opts.attempts ?? 1;
        if (job.attemptsMade < maxAttempts) return;

        const shoutout = await this.shoutouts.findById(job.data.shoutoutId);
        if (!shoutout || shoutout.status !== 'publishing') return;

        await this.shoutouts.save({ ...shoutout, status: 'failed' });
        await this.events.publish(job.data.shoutoutId, { status: 'failed' });
    }
}
