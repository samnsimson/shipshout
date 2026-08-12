import { Module } from '@nestjs/common';
import { SubscriptionPlanRepository } from '@shipshout/database';
import { TriggerModule } from '../trigger/trigger.module';
import { ShoutoutController } from './controllers/shoutout.controller';
import { ShoutoutRepository } from './repositories/shoutout.repository';
import { ShoutoutLimitService } from './services/shoutout-limit.service';
import { ShoutoutService } from './services/shoutout.service';

@Module({
    controllers: [ShoutoutController],
    providers: [ShoutoutRepository, ShoutoutService, ShoutoutLimitService, SubscriptionPlanRepository],
    exports: [ShoutoutRepository, ShoutoutLimitService],
})
export class ShoutoutModule {}
