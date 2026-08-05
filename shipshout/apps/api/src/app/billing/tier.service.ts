import { Injectable } from '@nestjs/common';
import { Tier } from '@shipshout/database';
import { PLAN_LIMITS, checkRepoLimit, checkReleaseLimit } from '@shipshout/billing';
import { ConnectedRepoRepository } from '../repositories/connected-repo.repository';
import { SubscriptionRepository, UsageCounterRepository } from './billing.repositories';

function currentPeriod() {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class TierService {
    constructor(
        private subs: SubscriptionRepository,
        private repos: ConnectedRepoRepository,
        private usage: UsageCounterRepository,
    ) {}

    private async tier(workspaceId: string): Promise<Tier> {
        const sub = await this.subs.findForWorkspace(workspaceId);
        return sub?.tier ?? Tier.Starter;
    }

    async assertCanAddRepo(workspaceId: string): Promise<void> {
        const tier = await this.tier(workspaceId);
        const count = await this.repos.count({ where: { workspace: { id: workspaceId } } });
        if (!checkRepoLimit(tier, count)) throw new Error(`Repository limit reached for ${tier} plan`);
    }

    async sourceIntegrationsAllowed(workspaceId: string): Promise<boolean> {
        const tier = await this.tier(workspaceId);
        return PLAN_LIMITS[tier].sourceIntegrations;
    }

    async tryConsumeRelease(workspaceId: string): Promise<boolean> {
        const tier = await this.tier(workspaceId);
        const period = currentPeriod();
        let counter = await this.usage.findForWorkspaceAndPeriod(workspaceId, period);
        if (!counter) counter = this.usage.create({ workspace: { id: workspaceId }, period, releasesProcessed: 0 });
        if (!checkReleaseLimit(tier, counter.releasesProcessed)) return false;
        counter.releasesProcessed += 1;
        await this.usage.save(counter);
        return true;
    }
}
