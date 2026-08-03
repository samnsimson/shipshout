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
    BullModule.registerQueue({ name: QUEUES.generate }, { name: QUEUES.dispatch }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
