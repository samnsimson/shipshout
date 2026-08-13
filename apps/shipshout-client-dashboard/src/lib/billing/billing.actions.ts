'use server';

import { AuthApi } from '@/lib/auth/auth.api';
import { BillingUtils } from './billing.utils';

type UrlResult = { url: string } | { error: string };

export class BillingActions {
    static async upgradeSubscription(plan: 'starter' | 'pro'): Promise<UrlResult> {
        const app = BillingUtils.clientAppUrl();
        const response = await AuthApi.fetch('/auth-service/subscription/upgrade', {
            method: 'POST',
            body: JSON.stringify({
                plan,
                successUrl: `${app}/dashboard/settings?billing=success`,
                cancelUrl: `${app}/dashboard/settings?billing=cancelled`,
                disableRedirect: true,
                customerType: 'user',
            }),
        });

        if (!response.ok) return { error: await AuthApi.readErrorMessage(response) };

        const body = (await response.json()) as { url?: string };
        if (!body.url) return { error: 'Missing Stripe Checkout URL' };
        return { url: body.url };
    }

    static async createBillingPortal(): Promise<UrlResult> {
        const app = BillingUtils.clientAppUrl();
        const response = await AuthApi.fetch('/auth-service/subscription/billing-portal', {
            method: 'POST',
            body: JSON.stringify({
                returnUrl: `${app}/dashboard/settings`,
                disableRedirect: true,
                customerType: 'user',
            }),
        });

        if (!response.ok) return { error: await AuthApi.readErrorMessage(response) };

        const body = (await response.json()) as { url?: string };
        if (!body.url) return { error: 'Missing Stripe Billing Portal URL' };
        return { url: body.url };
    }
}
