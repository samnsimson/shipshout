import { Injectable } from '@nestjs/common';
import { SubscriptionPlanLimits } from '@shipshout/database';
import { SubscriptionEntitlementService } from '../../subscription/services/subscription-entitlement.service';

@Injectable()
export class ShoutoutLimitService {
    constructor(private readonly entitlements: SubscriptionEntitlementService) {}

    getLimitsForUser(userId: string): Promise<SubscriptionPlanLimits> {
        return this.entitlements.getLimitsForUser(userId);
    }
}
