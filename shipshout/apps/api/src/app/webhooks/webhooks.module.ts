import { Module, forwardRef } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { QueueModule } from '@shipshout/queue/module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { DatabaseModule } from '../config/database.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { ReleaseEventRepository } from './release-event.repository';

@Module({
    imports: [DatabaseModule, forwardRef(() => BillingModule), RepositoriesModule, QueueModule],
    controllers: [WebhooksController],
    providers: [ReleaseEventRepository, WebhooksService],
})
export class WebhooksModule {}
