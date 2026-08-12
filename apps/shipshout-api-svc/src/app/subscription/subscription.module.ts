import { Module } from '@nestjs/common';
import { SubscriptionPlanRepository } from '@shipshout/database';
import { SubscriptionController } from './subscription.controller';
import { AuthSubscriptionRepository } from './repositories/auth-subscription.repository';
import { SubscriptionEntitlementService } from './services/subscription-entitlement.service';
import { SubscriptionPlansSeed } from './subscription-plans.seed';
import { SubscriptionService } from './subscription.service';

@Module({
    controllers: [SubscriptionController],
    providers: [SubscriptionPlanRepository, AuthSubscriptionRepository, SubscriptionEntitlementService, SubscriptionService, SubscriptionPlansSeed],
    exports: [SubscriptionEntitlementService],
})
export class SubscriptionModule {}
