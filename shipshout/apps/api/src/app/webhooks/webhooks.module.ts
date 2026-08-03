import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReleaseEvent } from '@shipshout/data-entities';
import { QueueModule } from '@shipshout/queue/module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [RepositoriesModule, QueueModule, TypeOrmModule.forFeature([ReleaseEvent])],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
