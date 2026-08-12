import { Module } from '@nestjs/common';
import { SubscriptionPlanRepository } from '@shipshout/database';
import { RepositoryModule } from '../repository/repository.module';
import { TriggerController } from './controllers/trigger.controller';
import { RepositoryTriggerRepository } from './repositories/repository-trigger.repository';
import { RepositoryWebhookRepository } from './repositories/repository-webhook.repository';
import { TriggerEventRepository } from './repositories/trigger-event.repository';
import { GithubWebhookService } from './services/github-webhook.service';
import { TriggerEventService } from './services/trigger-event.service';
import { TriggerLifecycleService } from './services/trigger-lifecycle.service';
import { TriggerService } from './services/trigger.service';

@Module({
    imports: [RepositoryModule],
    controllers: [TriggerController],
    providers: [
        RepositoryTriggerRepository,
        RepositoryWebhookRepository,
        TriggerEventRepository,
        GithubWebhookService,
        TriggerService,
        TriggerEventService,
        TriggerLifecycleService,
    ],
    exports: [TriggerService, TriggerLifecycleService, RepositoryTriggerRepository, RepositoryWebhookRepository, TriggerEventRepository],
})
export class TriggerModule {}
