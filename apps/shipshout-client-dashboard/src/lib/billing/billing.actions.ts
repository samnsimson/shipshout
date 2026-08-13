'use server';

import { BillingApi } from './billing.api';

export async function upgradeSubscription(plan: 'starter' | 'pro') {
    return BillingApi.upgradeSubscription(plan);
}

export async function createBillingPortal() {
    return BillingApi.createBillingPortal();
}
