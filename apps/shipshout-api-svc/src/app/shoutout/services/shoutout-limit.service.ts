import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { SubscriptionPlanLimits, SubscriptionPlanRepository } from '@shipshout/database';
import { DataSource } from 'typeorm';

@Injectable()
export class ShoutoutLimitService {
    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        private readonly subscriptionPlans: SubscriptionPlanRepository,
    ) {}

    async getLimitsForUser(userId: string): Promise<SubscriptionPlanLimits> {
        const planName = await this.findActivePlanName(userId);
        const plan = await this.subscriptionPlans.findActiveByName(planName);
        return plan?.limits ?? { repos: 0, releasesPerMonth: 0 };
    }

    private async findActivePlanName(userId: string): Promise<string> {
        try {
            const rows = (await this.dataSource.query(
                `SELECT plan FROM subscription WHERE reference_id = $1 AND status IN ('active', 'trialing') ORDER BY created_at DESC LIMIT 1`,
                [userId],
            )) as Array<{ plan: string }>;
            if (rows[0]?.plan) return rows[0].plan;
        } catch {
            // Better Auth subscription table may not exist in all environments yet.
        }
        return 'free';
    }
}
