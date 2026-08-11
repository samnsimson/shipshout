jest.mock('@thallesp/nestjs-better-auth', () => ({
    AuthService: class BetterAuthService {},
}));

import { SubscriptionPlanRepository } from '@shipshout/database';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionService', () => {
    const plans = {
        findActiveOrdered: jest.fn(),
        findActiveByName: jest.fn(),
    };
    const betterAuth = {
        api: {
            listActiveSubscriptions: jest.fn(),
        },
    };

    let service: SubscriptionService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new SubscriptionService(plans as unknown as SubscriptionPlanRepository, betterAuth as unknown as BetterAuthService);
    });

    it('returns free when no active subscription', async () => {
        betterAuth.api.listActiveSubscriptions.mockResolvedValue([]);
        plans.findActiveByName.mockResolvedValue({ name: 'free', limits: { repos: 0, releasesPerMonth: 0 } });
        await expect(service.getMe('u1', {})).resolves.toMatchObject({ plan: 'free', status: null });
    });

    it('returns starter when trialing', async () => {
        betterAuth.api.listActiveSubscriptions.mockResolvedValue([
            { status: 'trialing', plan: 'starter', periodEnd: new Date('2030-01-01'), stripeSubscriptionId: 'sub_1' },
        ]);
        plans.findActiveByName.mockResolvedValue({ name: 'starter', limits: { repos: 1, releasesPerMonth: 10 } });
        await expect(service.getMe('u1', {})).resolves.toMatchObject({
            plan: 'starter',
            status: 'trialing',
            stripeSubscriptionId: 'sub_1',
            limits: { repos: 1, releasesPerMonth: 10 },
        });
    });

    it('lists active plans', async () => {
        plans.findActiveOrdered.mockResolvedValue([
            { name: 'free', displayName: 'Free', trialDays: null, limits: { repos: 0, releasesPerMonth: 0 }, stripePriceId: null },
            { name: 'starter', displayName: 'Starter', trialDays: 14, limits: { repos: 1, releasesPerMonth: 10 }, stripePriceId: 'price_s' },
        ]);
        await expect(service.listPlans()).resolves.toEqual({
            plans: [
                { name: 'free', displayName: 'Free', trialDays: null, limits: { repos: 0, releasesPerMonth: 0 }, isBillable: false },
                { name: 'starter', displayName: 'Starter', trialDays: 14, limits: { repos: 1, releasesPerMonth: 10 }, isBillable: true },
            ],
        });
    });
});
