export type AuthBillablePlanRow = {
    name: string;
    stripePriceId: string;
    stripeAnnualPriceId?: string | null;
    trialDays?: number | null;
    limits: Record<string, number | null>;
};

export type GetSubscriptionPlans = () => Promise<AuthBillablePlanRow[]>;

export type StripePluginPlan = {
    name: string;
    priceId: string;
    annualDiscountPriceId?: string;
    freeTrial?: { days: number };
    limits: Record<string, number | null>;
};
