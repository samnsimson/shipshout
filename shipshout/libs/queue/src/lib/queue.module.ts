import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from './queue.constants.js';

function connection() {
    const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
    return { host: url.hostname, port: Number(url.port || 6379) };
}

@Module({
    imports: [
        BullModule.forRoot({ connection: connection() }),
        BullModule.registerQueue(
            {
                name: QUEUES.generate,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 2000 },
                },
            },
            { name: QUEUES.dispatch, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } } },
        ),
    ],
    exports: [BullModule],
})
export class QueueModule {}
