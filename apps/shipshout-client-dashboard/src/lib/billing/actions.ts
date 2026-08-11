'use server';

import { authFetch, readErrorMessage } from '../auth/api';

function clientAppUrl(): string {
    return (process.env.CLIENT_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

type UrlResult = { url: string } | { error: string };

export async function upgradeSubscriptionAction(plan: 'starter' | 'pro'): Promise<UrlResult> {
    const app = clientAppUrl();
    const response = await authFetch('/auth-service/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({
            plan,
            successUrl: `${app}/dashboard/settings?billing=success`,
            cancelUrl: `${app}/dashboard/settings?billing=cancelled`,
            disableRedirect: true,
            customerType: 'user',
        }),
    });

    if (!response.ok) return { error: await readErrorMessage(response) };

    const body = (await response.json()) as { url?: string };
    if (!body.url) return { error: 'Missing Stripe Checkout URL' };
    return { url: body.url };
}

export async function createBillingPortalAction(): Promise<UrlResult> {
    const app = clientAppUrl();
    const response = await authFetch('/auth-service/subscription/billing-portal', {
        method: 'POST',
        body: JSON.stringify({
            returnUrl: `${app}/dashboard/settings`,
            disableRedirect: true,
            customerType: 'user',
        }),
    });

    if (!response.ok) return { error: await readErrorMessage(response) };

    const body = (await response.json()) as { url?: string };
    if (!body.url) return { error: 'Missing Stripe Billing Portal URL' };
    return { url: body.url };
}
