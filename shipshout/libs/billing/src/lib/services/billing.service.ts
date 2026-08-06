import Stripe from 'stripe';
import { Repository } from 'typeorm';
import { Workspace, Tier } from '@shipshout/database';

const PRICE_ENV: Record<Tier, string> = {
    [Tier.Starter]: 'STRIPE_PRICE_STARTER',
    [Tier.Pro]: 'STRIPE_PRICE_PRO',
    [Tier.Growth]: 'STRIPE_PRICE_GROWTH',
};

export class BillingService {
    constructor(
        private stripe: Stripe,
        private workspaces: Repository<Workspace>,
    ) {}

    private async ensureCustomer(workspaceId: string): Promise<{ ws: Workspace; customerId: string }> {
        const ws = await this.workspaces.findOne({ where: { id: workspaceId } });
        if (!ws) throw new Error('Workspace not found');
        if (ws.stripeCustomerId) return { ws, customerId: ws.stripeCustomerId };
        const customer = await this.stripe.customers.create({ metadata: { workspaceId } });
        ws.stripeCustomerId = customer.id;
        await this.workspaces.save(ws);
        return { ws, customerId: customer.id };
    }

    async createCheckoutSession(workspaceId: string, tier: Tier): Promise<{ url: string }> {
        const { customerId } = await this.ensureCustomer(workspaceId);
        const price = process.env[PRICE_ENV[tier]];
        if (!price) throw new Error(`Missing price id for ${tier}`);
        const session = await this.stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [{ price, quantity: 1 }],
            success_url: `${process.env.WEB_BASE_URL}/${workspaceId}/settings/billing?ok=1`,
            cancel_url: `${process.env.WEB_BASE_URL}/${workspaceId}/settings/billing`,
            metadata: { workspaceId, tier },
        });
        return { url: session.url ?? '' };
    }

    async createPortalSession(workspaceId: string): Promise<{ url: string }> {
        const { customerId } = await this.ensureCustomer(workspaceId);
        const portal = await this.stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${process.env.WEB_BASE_URL}/${workspaceId}/settings/billing`,
        });
        return { url: portal.url };
    }
}
