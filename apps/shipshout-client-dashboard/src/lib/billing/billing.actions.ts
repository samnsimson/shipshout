'use server';

import { BillingApi } from './billing.api';

export class BillingActions {
    static upgradeSubscription(plan: 'starter' | 'pro') {
        return BillingApi.upgradeSubscription(plan);
    }

    static createBillingPortal() {
        return BillingApi.createBillingPortal();
    }
}
