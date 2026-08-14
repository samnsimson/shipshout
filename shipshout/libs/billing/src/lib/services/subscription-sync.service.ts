import { Repository } from 'typeorm';
import { Subscription, SubscriptionStatus, Tier, Workspace } from '@shipshout/database';

export class SubscriptionSyncService {
    constructor(
        private subs: Repository<Subscription>,
        private workspaces: Repository<Workspace>,
    ) {}

    private async upsert(workspaceId: string, patch: Partial<Subscription>) {
        let sub = await this.subs.findOne({ where: { workspace: { id: workspaceId } } });
        if (!sub) sub = this.subs.create({ workspace: { id: workspaceId } as Workspace });
        Object.assign(sub, patch);
        await this.subs.save(sub);
        const ws = await this.workspaces.findOne({ where: { id: workspaceId } });
        if (ws && patch.tier) {
            ws.plan = patch.tier;
            await this.workspaces.save(ws);
        }
    }

    async applyEvent(event: { type: string; data: { object: any } }): Promise<void> {
        const obj = event.data.object;
        if (event.type === 'checkout.session.completed') {
            await this.upsert(obj.metadata.workspaceId, {
                stripeSubId: obj.subscription,
                tier: obj.metadata.tier as Tier,
                status: SubscriptionStatus.Active,
            });
        } else if (event.type === 'customer.subscription.updated') {
            const workspaceId = obj.metadata?.workspaceId;
            if (!workspaceId) return;
            const status =
                obj.status === 'active' ? SubscriptionStatus.Active : obj.status === 'past_due' ? SubscriptionStatus.PastDue : SubscriptionStatus.Canceled;
            await this.upsert(workspaceId, { status, currentPeriodEnd: new Date((obj.current_period_end ?? 0) * 1000) });
        } else if (event.type === 'customer.subscription.deleted') {
            const workspaceId = obj.metadata?.workspaceId;
            if (!workspaceId) return;
            await this.upsert(workspaceId, { status: SubscriptionStatus.Canceled, tier: Tier.Starter });
        }
    }
}
