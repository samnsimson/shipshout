import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUES, GenerateJob } from '@shipshout/queue';
import { Channel } from '@shipshout/database';
import { GenerationService } from '@shipshout/ai';

@Processor(QUEUES.generate)
export class GenerateProcessor extends WorkerHost {
    constructor(private generation: GenerationService) {
        super();
    }

    async process(job: Job<GenerateJob>): Promise<void> {
        await this.generation.generateForEvent(job.data.releaseEventId, [Channel.X, Channel.LinkedIn, Channel.Email]);
    }
}
