import { ApiErrorUtils } from '@/lib/api/api-error.utils';
import { ApiClient } from '@shipshout/api-client';
import { BillingUtils } from './billing.utils';

type UrlResult = { url: string } | { error: string };

export class BillingApi {
    static async listSubscriptionPlans() {
        return ApiClient.fetchProtected((api) => api.listSubscriptionPlans());
    }

    static async getMySubscription() {
        return ApiClient.fetchProtected((api) => api.getMySubscription());
    }

    static async listMyPayments() {
        return ApiClient.fetchProtected((api) => api.listMyPayments());
    }

    static async upgradeSubscription(plan: 'starter' | 'pro'): Promise<UrlResult> {
        const app = BillingUtils.clientAppUrl();
        const result = await ApiClient.fetchProtected((api) =>
            api.upgradeSubscription({
                body: {
                    plan,
                    successUrl: `${app}/dashboard/settings?billing=success`,
                    cancelUrl: `${app}/dashboard/settings?billing=cancelled`,
                    disableRedirect: true,
                    customerType: 'user',
                },
            }),
        );

        if (result.error || !result.response?.ok)
            return { error: ApiErrorUtils.message(result.error, `Request failed (${result.response?.status ?? 'unknown'})`) };
        if (!result.data?.url) return { error: 'Missing Stripe Checkout URL' };
        return { url: result.data.url };
    }

    static async createBillingPortal(): Promise<UrlResult> {
        const app = BillingUtils.clientAppUrl();
        const result = await ApiClient.fetchProtected((api) =>
            api.createBillingPortal({ body: { returnUrl: `${app}/dashboard/settings`, disableRedirect: true, customerType: 'user' } }),
        );
        if (result.error || !result.response?.ok)
            return { error: ApiErrorUtils.message(result.error, `Request failed (${result.response?.status ?? 'unknown'})`) };
        if (!result.data?.url) return { error: 'Missing Stripe Billing Portal URL' };
        return { url: result.data.url };
    }
}
