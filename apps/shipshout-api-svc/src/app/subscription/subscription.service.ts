import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionPlanRepository } from '@shipshout/database';
import { SubscriptionMeResponseDto, SubscriptionPlansListResponseDto } from './dto/subscription-response.dto';
import { SubscriptionEntitlementService } from './services/subscription-entitlement.service';

@Injectable()
export class SubscriptionService {
    constructor(
        private readonly plans: SubscriptionPlanRepository,
        private readonly entitlements: SubscriptionEntitlementService,
    ) {}

    async listPlans(): Promise<SubscriptionPlansListResponseDto> {
        const rows = await this.plans.findActiveOrdered();
        return {
            plans: rows.map((row) => ({
                name: row.name,
                displayName: row.displayName,
                trialDays: row.trialDays,
                limits: row.limits,
                isBillable: Boolean(row.stripePriceId),
            })),
        };
    }

    async getMe(userId: string): Promise<SubscriptionMeResponseDto> {
        const { planName, limits, subscription } = await this.entitlements.getEntitlements(userId);
        if (!subscription) {
            const free = await this.plans.findActiveByName('free');
            if (!free) throw new NotFoundException('Free plan is not configured');
            return { plan: 'free', status: null, periodEnd: null, stripeSubscriptionId: null, limits: free.limits };
        }

        return {
            plan: planName,
            status: subscription.status,
            periodEnd: subscription.periodEnd,
            stripeSubscriptionId: subscription.stripeSubscriptionId,
            limits,
        };
    }
}
