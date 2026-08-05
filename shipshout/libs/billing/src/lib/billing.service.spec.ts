import { BillingService } from './billing.service.js';
import { Tier } from '@shipshout/database';

describe('BillingService.createCheckoutSession', () => {
    it('creates a checkout session with the tier price', async () => {
        process.env.STRIPE_PRICE_PRO = 'price_pro';
        const stripe = {
            checkout: { sessions: { create: jest.fn(async () => ({ url: 'https://checkout' })) } },
            customers: { create: jest.fn(async () => ({ id: 'cus_1' })) },
        };
        const workspaces = { findOne: jest.fn(async () => ({ id: 'w1', stripeCustomerId: 'cus_1' })), save: jest.fn() };
        const svc = new BillingService(stripe as any, workspaces as any);
        const out = await svc.createCheckoutSession('w1', Tier.Pro);
        expect(out.url).toBe('https://checkout');
        expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
            expect.objectContaining({
                line_items: [{ price: 'price_pro', quantity: 1 }],
            }),
        );
    });
});
