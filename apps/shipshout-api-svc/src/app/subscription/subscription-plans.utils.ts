import type { AuthBillablePlanRow } from '@shipshout/auth';
import { Pool } from 'pg';

export class SubscriptionPlansUtils {
    /** Returns a loader of active billable plans from public.subscription_plans for Better Auth Stripe. */
    static createGetSubscriptionPlans(databaseUrl: string): () => Promise<AuthBillablePlanRow[]> {
        const pool = new Pool({ connectionString: databaseUrl });
        return async () => {
            const { rows } = await pool.query<AuthBillablePlanRow>(
                `SELECT name,
                        stripe_price_id AS "stripePriceId",
                        stripe_annual_price_id AS "stripeAnnualPriceId",
                        trial_days AS "trialDays",
                        limits
                 FROM subscription_plans
                 WHERE is_active = true AND stripe_price_id IS NOT NULL`,
            );
            return rows;
        };
    }
}
