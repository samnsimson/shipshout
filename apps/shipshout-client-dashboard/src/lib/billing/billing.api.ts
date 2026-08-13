import { ShipshoutApi } from '@/lib/shipshout.api';
import { BillingUtils } from './billing.utils';

type UrlResult = { url: string } | { error: string };

export class BillingApi {
    static getClient() {
        return ShipshoutApi.getApiClient();
    }

    /** Better Auth Stripe plugin — not yet in OpenAPI; add to spec and regenerate client. */
    static async upgradeSubscription(plan: 'starter' | 'pro'): Promise<UrlResult> {
        const app = BillingUtils.clientAppUrl();
        const response = await ShipshoutApi.fetch('/auth-service/subscription/upgrade', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                plan,
                successUrl: `${app}/dashboard/settings?billing=success`,
                cancelUrl: `${app}/dashboard/settings?billing=cancelled`,
                disableRedirect: true,
                customerType: 'user',
            }),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => null);
            return { error: ShipshoutApi.errorMessage(errorBody, `Request failed (${response.status})`) };
        }

        const body = (await response.json()) as { url?: string };
        if (!body.url) return { error: 'Missing Stripe Checkout URL' };
        return { url: body.url };
    }

    /** Better Auth Stripe plugin — not yet in OpenAPI; add to spec and regenerate client. */
    static async createBillingPortal(): Promise<UrlResult> {
        const app = BillingUtils.clientAppUrl();
        const response = await ShipshoutApi.fetch('/auth-service/subscription/billing-portal', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                returnUrl: `${app}/dashboard/settings`,
                disableRedirect: true,
                customerType: 'user',
            }),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => null);
            return { error: ShipshoutApi.errorMessage(errorBody, `Request failed (${response.status})`) };
        }

        const body = (await response.json()) as { url?: string };
        if (!body.url) return { error: 'Missing Stripe Billing Portal URL' };
        return { url: body.url };
    }
}
