import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUES, DispatchJob } from '@shipshout/queue';
import { DispatchService } from '@shipshout/integrations-core';

@Processor(QUEUES.dispatch)
export class DispatchProcessor extends WorkerHost {
    constructor(private dispatch: DispatchService) {
        super();
    }

    async process(job: Job<DispatchJob>): Promise<void> {
        await this.dispatch.dispatch(job.data.draftId);
    }
}
