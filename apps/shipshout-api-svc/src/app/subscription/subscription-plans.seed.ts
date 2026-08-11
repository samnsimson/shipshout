import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionPlanRepository } from '@shipshout/database';

@Injectable()
export class SubscriptionPlansSeed implements OnModuleInit {
    private readonly logger = new Logger(SubscriptionPlansSeed.name);

    constructor(
        private readonly plans: SubscriptionPlanRepository,
        private readonly config: ConfigService,
    ) {}

    async onModuleInit(): Promise<void> {
        const starterPrice = this.config.get<string>('STRIPE_PRICE_STARTER');
        const proPrice = this.config.get<string>('STRIPE_PRICE_PRO');
        await this.upsert({
            name: 'starter',
            displayName: 'Starter',
            stripePriceId: starterPrice ?? null,
            trialDays: 14,
            limits: { repos: 1, releasesPerMonth: 10 },
            sortOrder: 1,
        });
        await this.upsert({
            name: 'pro',
            displayName: 'Pro',
            stripePriceId: proPrice ?? null,
            trialDays: null,
            limits: { repos: 3, releasesPerMonth: null },
            sortOrder: 2,
        });
        if (!starterPrice || !proPrice) this.logger.warn('STRIPE_PRICE_STARTER/PRO missing; billable plans seeded without price ids');
    }

    private async upsert(input: {
        name: string;
        displayName: string;
        stripePriceId: string | null;
        trialDays: number | null;
        limits: { repos: number; releasesPerMonth: number | null };
        sortOrder: number;
    }): Promise<void> {
        const existing = await this.plans.findOne({ where: { name: input.name } });
        if (existing) {
            existing.displayName = input.displayName;
            existing.stripePriceId = input.stripePriceId;
            existing.trialDays = input.trialDays;
            existing.limits = input.limits;
            existing.sortOrder = input.sortOrder;
            existing.isActive = true;
            await this.plans.save(existing);
            return;
        }
        await this.plans.save(this.plans.create({ ...input, stripeAnnualPriceId: null, isActive: true }));
    }
}
