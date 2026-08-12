jest.mock('better-auth', () => ({ betterAuth: jest.fn(() => ({ id: 'auth' })) }));
jest.mock('better-auth/plugins', () => ({
    username: jest.fn(() => ({ id: 'username' })),
    oneTimeToken: jest.fn(() => ({ id: 'oneTimeToken' })),
}));
jest.mock('@better-auth/stripe', () => ({ stripe: jest.fn(() => ({ id: 'stripe-plugin' })) }));
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));
jest.mock('pg', () => ({ Pool: jest.fn() }));
jest.mock('better-auth/api', () => ({
    APIError: class APIError extends Error {},
}));

import { betterAuth } from 'better-auth';
import { stripe } from '@better-auth/stripe';
import { createAuth } from '../auth.config';

describe('createAuth stripe plugin', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('registers stripe plugin when secrets are set', () => {
        createAuth({
            databaseUrl: 'postgres://x',
            clientAppUrl: 'http://localhost:3000',
            resendApiKey: 're_test',
            stripeSecretKey: 'sk_test',
            stripeWebhookSecret: 'whsec_test',
            getSubscriptionPlans: async () => [
                { name: 'starter', stripePriceId: 'price_s', limits: { repos: 1, releasesPerMonth: 10 }, trialDays: 14 },
            ],
        });

        expect(stripe).toHaveBeenCalled();
        const call = (betterAuth as jest.Mock).mock.calls[0][0];
        expect(call.plugins).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'stripe-plugin' })]));
    });

    it('omits stripe plugin when secrets are absent', () => {
        createAuth({
            databaseUrl: 'postgres://x',
            clientAppUrl: 'http://localhost:3000',
            resendApiKey: 're_test',
        });

        expect(stripe).not.toHaveBeenCalled();
    });

    it('throws when only one stripe secret is set', () => {
        expect(() =>
            createAuth({
                databaseUrl: 'postgres://x',
                clientAppUrl: 'http://localhost:3000',
                resendApiKey: 're_test',
                stripeSecretKey: 'sk_test',
            }),
        ).toThrow(/both required/i);
    });
});
