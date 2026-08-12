import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionPlanRepository } from '@shipshout/database';
import { EmailClient } from '@shipshout/email-client';
import { AiModule } from '../ai/ai.module';
import { ChannelModule } from '../channels/channel.module';
import { RepositoryModule } from '../repository/repository.module';
import { TriggerModule } from '../trigger/trigger.module';
import { ShoutoutController } from './controllers/shoutout.controller';
import { ShoutoutGenerationProcessor } from './processors/shoutout-generation.processor';
import { ShoutoutChannelDraftRepository } from './repositories/shoutout-channel-draft.repository';
import { ShoutoutRepository } from './repositories/shoutout.repository';
import { ShoutoutEventsService } from './services/shoutout-events.service';
import { ShoutoutGenerationService } from './services/shoutout-generation.service';
import { ShoutoutLimitService } from './services/shoutout-limit.service';
import { ShoutoutQueueService } from './services/shoutout-queue.service';
import { ShoutoutService } from './services/shoutout.service';
import { UserEmailLookup } from './services/user-email-lookup.service';

@Module({
    imports: [
        BullModule.registerQueue({ name: 'shoutout-generation' }, { name: 'shoutout-dispatch' }),
        forwardRef(() => ChannelModule),
        AiModule,
        RepositoryModule,
        TriggerModule,
    ],
    controllers: [ShoutoutController],
    providers: [
        ShoutoutRepository,
        ShoutoutChannelDraftRepository,
        ShoutoutService,
        ShoutoutLimitService,
        ShoutoutQueueService,
        ShoutoutGenerationService,
        ShoutoutGenerationProcessor,
        ShoutoutEventsService,
        UserEmailLookup,
        SubscriptionPlanRepository,
        {
            provide: EmailClient,
            inject: [ConfigService],
            useFactory: (config: ConfigService) => new EmailClient(config.getOrThrow('RESEND_API_KEY'), config.get('EMAIL_FROM')),
        },
    ],
    exports: [ShoutoutRepository, ShoutoutLimitService, ShoutoutQueueService],
})
export class ShoutoutModule {}
