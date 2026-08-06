import { Module, forwardRef } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { QueueModule } from '@shipshout/queue/module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { DatabaseModule } from '../config/database.module';
import { AuthModule } from '../auth/auth.module';
import { WebhooksController } from './controllers/webhooks.controller';
import { RepositorySimulateController } from './controllers/repository-simulate.controller';
import { WebhooksService } from './services/webhooks.service';
import { ReleaseEventRepository } from './repositories/release-event.repository';

@Module({
    imports: [DatabaseModule, AuthModule, forwardRef(() => BillingModule), RepositoriesModule, QueueModule],
    controllers: [WebhooksController, RepositorySimulateController],
    providers: [ReleaseEventRepository, WebhooksService],
})
export class WebhooksModule {}
