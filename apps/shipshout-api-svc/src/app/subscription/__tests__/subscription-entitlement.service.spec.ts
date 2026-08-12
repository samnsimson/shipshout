import { SubscriptionPlanRepository } from '@shipshout/database';
import { AuthSubscriptionRepository } from '../repositories/auth-subscription.repository';
import { SubscriptionEntitlementService } from '../services/subscription-entitlement.service';

describe('SubscriptionEntitlementService', () => {
    const authSubscriptions = { findActiveForUser: jest.fn() };
    const subscriptionPlans = { findActiveByName: jest.fn() };
    let service: SubscriptionEntitlementService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new SubscriptionEntitlementService(
            authSubscriptions as unknown as AuthSubscriptionRepository,
            subscriptionPlans as unknown as SubscriptionPlanRepository,
        );
    });

    it('returns free limits when no active subscription', async () => {
        authSubscriptions.findActiveForUser.mockResolvedValue(null);
        subscriptionPlans.findActiveByName.mockResolvedValue({ limits: { repos: 0, releasesPerMonth: 0, channels: [] } });
        await expect(service.getEntitlements('user-1')).resolves.toEqual({
            planName: 'free',
            limits: { repos: 0, releasesPerMonth: 0, channels: [] },
            subscription: null,
        });
    });

    it('returns starter channel entitlements for trialing subscription', async () => {
        authSubscriptions.findActiveForUser.mockResolvedValue({
            plan: 'starter',
            status: 'trialing',
            periodEnd: '2030-01-01T00:00:00.000Z',
            stripeSubscriptionId: 'sub_1',
        });
        subscriptionPlans.findActiveByName.mockResolvedValue({
            limits: { repos: 1, releasesPerMonth: 10, channels: ['email_alert'] },
        });
        await expect(service.getLimitsForUser('user-1')).resolves.toEqual({
            repos: 1,
            releasesPerMonth: 10,
            channels: ['email_alert'],
        });
    });

    it('resolves active plan name from subscription row', async () => {
        authSubscriptions.findActiveForUser.mockResolvedValue({
            plan: 'pro',
            status: 'active',
            periodEnd: '2030-01-01T00:00:00.000Z',
            stripeSubscriptionId: 'sub_2',
        });
        subscriptionPlans.findActiveByName.mockResolvedValue({
            limits: { repos: 3, releasesPerMonth: null, channels: ['email_alert', 'email_newsletter'] },
        });
        await expect(service.resolveActivePlanName('user-1')).resolves.toBe('pro');
    });
});
