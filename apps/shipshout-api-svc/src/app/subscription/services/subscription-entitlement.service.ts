import { Injectable } from '@nestjs/common';
import { SubscriptionPlanLimits, SubscriptionPlanRepository } from '@shipshout/database';
import { AuthSubscriptionRepository, type AuthSubscriptionRow } from '../repositories/auth-subscription.repository';

export type UserEntitlements = {
    planName: string;
    limits: SubscriptionPlanLimits;
    subscription: AuthSubscriptionRow | null;
};

@Injectable()
export class SubscriptionEntitlementService {
    constructor(
        private readonly authSubscriptions: AuthSubscriptionRepository,
        private readonly subscriptionPlans: SubscriptionPlanRepository,
    ) {}

    async getEntitlements(userId: string): Promise<UserEntitlements> {
        const subscription = await this.authSubscriptions.findActiveForUser(userId);
        const planName = subscription?.plan ?? 'free';
        const plan = await this.subscriptionPlans.findActiveByName(planName);
        const limits = plan?.limits ?? { repos: 0, releasesPerMonth: 0, channels: [] };
        return { planName, limits, subscription };
    }

    async getLimitsForUser(userId: string): Promise<SubscriptionPlanLimits> {
        return (await this.getEntitlements(userId)).limits;
    }

    async resolveActivePlanName(userId: string): Promise<string> {
        return (await this.getEntitlements(userId)).planName;
    }
}
