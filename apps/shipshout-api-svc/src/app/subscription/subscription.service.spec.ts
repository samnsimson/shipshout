import { SubscriptionPlanRepository } from '@shipshout/database';
import { SubscriptionEntitlementService } from './services/subscription-entitlement.service';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionService', () => {
    const plans = {
        findActiveOrdered: jest.fn(),
        findActiveByName: jest.fn(),
    };
    const entitlements = {
        getEntitlements: jest.fn(),
    };

    let service: SubscriptionService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new SubscriptionService(plans as unknown as SubscriptionPlanRepository, entitlements as unknown as SubscriptionEntitlementService);
    });

    it('returns free when no active subscription', async () => {
        entitlements.getEntitlements.mockResolvedValue({
            planName: 'free',
            limits: { repos: 0, releasesPerMonth: 0, channels: [] },
            subscription: null,
        });
        plans.findActiveByName.mockResolvedValue({ name: 'free', limits: { repos: 0, releasesPerMonth: 0, channels: [] } });
        await expect(service.getMe('u1')).resolves.toMatchObject({ plan: 'free', status: null, limits: { channels: [] } });
    });

    it('returns starter when trialing', async () => {
        entitlements.getEntitlements.mockResolvedValue({
            planName: 'starter',
            limits: { repos: 1, releasesPerMonth: 10, channels: ['email_alert'] },
            subscription: {
                plan: 'starter',
                status: 'trialing',
                periodEnd: '2030-01-01T00:00:00.000Z',
                stripeSubscriptionId: 'sub_1',
            },
        });
        await expect(service.getMe('u1')).resolves.toMatchObject({
            plan: 'starter',
            status: 'trialing',
            stripeSubscriptionId: 'sub_1',
            limits: { repos: 1, releasesPerMonth: 10, channels: ['email_alert'] },
        });
    });

    it('lists active plans', async () => {
        plans.findActiveOrdered.mockResolvedValue([
            { name: 'free', displayName: 'Free', trialDays: null, limits: { repos: 0, releasesPerMonth: 0, channels: [] }, stripePriceId: null },
            { name: 'starter', displayName: 'Starter', trialDays: 14, limits: { repos: 1, releasesPerMonth: 10, channels: ['email_alert'] }, stripePriceId: 'price_s' },
        ]);
        await expect(service.listPlans()).resolves.toEqual({
            plans: [
                { name: 'free', displayName: 'Free', trialDays: null, limits: { repos: 0, releasesPerMonth: 0, channels: [] }, isBillable: false },
                { name: 'starter', displayName: 'Starter', trialDays: 14, limits: { repos: 1, releasesPerMonth: 10, channels: ['email_alert'] }, isBillable: true },
            ],
        });
    });
});
