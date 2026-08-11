import { Module } from '@nestjs/common';
import { SubscriptionPlanRepository } from '@shipshout/database';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionPlansSeed } from './subscription-plans.seed';
import { SubscriptionService } from './subscription.service';

@Module({
    controllers: [SubscriptionController],
    providers: [SubscriptionPlanRepository, SubscriptionService, SubscriptionPlansSeed],
})
export class SubscriptionModule {}
