import { z } from 'zod';
import type { GetSubscriptionPlans } from '../../billing/subscription-plan.types';

export const authOptionsSchema = z.object({
    baseUrl: z.string().optional(),
    secret: z.string().optional(),
    databaseUrl: z.string(),
    clientAppUrl: z.string().url(),
    cookieDomain: z.string().optional(),
    googleClientId: z.string().optional(),
    googleClientSecret: z.string().optional(),
    githubClientId: z.string().optional(),
    githubClientSecret: z.string().optional(),
    stripeSecretKey: z.string().optional(),
    stripeWebhookSecret: z.string().optional(),
    getSubscriptionPlans: z.custom<GetSubscriptionPlans>().optional(),
});
