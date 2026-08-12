import { AuthBillablePlanRow, StripePluginPlan } from './subscription-plan.types';

export class BillingUtils {
    static mapPlansForStripe(rows: AuthBillablePlanRow[]): StripePluginPlan[] {
        const plans: StripePluginPlan[] = [];
        for (const row of rows) {
            if (!row.stripePriceId) continue;
            const plan: StripePluginPlan = { name: row.name, priceId: row.stripePriceId, limits: row.limits };
            if (row.stripeAnnualPriceId) plan.annualDiscountPriceId = row.stripeAnnualPriceId;
            if (row.trialDays != null && row.trialDays > 0) plan.freeTrial = { days: row.trialDays };
            plans.push(plan);
        }
        return plans;
    }
}
