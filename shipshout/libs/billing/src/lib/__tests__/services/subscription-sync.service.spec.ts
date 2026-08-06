import { SubscriptionSyncService } from '../../services/subscription-sync.service';
import { Tier, SubscriptionStatus } from '@shipshout/database';

describe('SubscriptionSyncService.applyEvent', () => {
    it('activates a subscription on checkout.session.completed', async () => {
        const subs = { findOne: jest.fn(async () => null), create: (d: any) => d, save: jest.fn(async (d: any) => d) };
        const workspaces = { findOne: jest.fn(async () => ({ id: 'w1' })), save: jest.fn(async (d: any) => d) };
        const svc = new SubscriptionSyncService(subs as any, workspaces as any);
        await svc.applyEvent({
            type: 'checkout.session.completed',
            data: { object: { subscription: 'sub_1', metadata: { workspaceId: 'w1', tier: 'pro' } } },
        } as any);
        expect(subs.save).toHaveBeenCalledWith(expect.objectContaining({ tier: Tier.Pro, status: SubscriptionStatus.Active }));
    });
});
