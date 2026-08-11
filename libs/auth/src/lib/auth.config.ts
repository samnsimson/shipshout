import { stripe } from '@better-auth/stripe';
import { betterAuth } from 'better-auth';
import { oneTimeToken, username } from 'better-auth/plugins';
import { Pool } from 'pg';
import Stripe from 'stripe';
import { mapPlansForStripe } from './billing/map-plans-for-stripe';
import { AuthOptions } from './contracts/types/auth.types';
import { AuthUtils } from './utils/auth-http';

function buildStripePlugin(opts: AuthOptions) {
    const hasSecret = Boolean(opts.stripeSecretKey);
    const hasWebhook = Boolean(opts.stripeWebhookSecret);
    if (hasSecret !== hasWebhook) throw new Error('STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are both required when enabling Stripe');
    if (!opts.stripeSecretKey || !opts.stripeWebhookSecret) return null;

    const stripeClient = new Stripe(opts.stripeSecretKey, { apiVersion: '2026-07-29.dahlia' });
    return stripe({
        // Stripe CJS/ESM typings diverge under bun+tsc; runtime client is fine for the plugin.
        stripeClient: stripeClient as never,
        stripeWebhookSecret: opts.stripeWebhookSecret,
        createCustomerOnSignUp: true,
        subscription: {
            enabled: true,
            plans: async () => mapPlansForStripe(await (opts.getSubscriptionPlans?.() ?? [])),
        },
    });
}

export function createAuth(opts: AuthOptions) {
    const clientAppUrl = opts.clientAppUrl.replace(/\/$/, '');
    const useSecureCookies = (opts.baseUrl ?? '').startsWith('https://');
    const stripePlugin = buildStripePlugin(opts);
    return betterAuth({
        secret: opts.secret,
        baseURL: opts.baseUrl,
        basePath: '/auth-service',
        trustedOrigins: [clientAppUrl],
        experimental: { joins: true },
        advanced: {
            useSecureCookies,
            defaultCookieAttributes: {
                sameSite: 'lax',
                path: '/',
                httpOnly: true,
                secure: useSecureCookies,
            },
            ...(opts.cookieDomain
                ? {
                      crossSubDomainCookies: {
                          enabled: true,
                          domain: opts.cookieDomain,
                      },
                  }
                : {}),
        },
        database: new Pool({ connectionString: opts.databaseUrl, options: '-c search_path=auth' }),
        emailAndPassword: {
            enabled: true,
            requireEmailVerification: true,
            sendResetPassword: async ({ user, url }) => AuthUtils.sendResetPasswordEmail(user, url),
        },
        emailVerification: {
            sendOnSignIn: true,
            autoSignInAfterVerification: false,
            sendVerificationEmail: async ({ user, token }) => {
                const url = `${clientAppUrl}/verify-email?token=${encodeURIComponent(token)}`;
                await AuthUtils.sendVerificationEmail(user, url);
            },
        },
        socialProviders: {
            google: { clientId: opts.googleClientId ?? '', clientSecret: opts.googleClientSecret ?? '' },
            github: { clientId: opts.githubClientId ?? '', clientSecret: opts.githubClientSecret ?? '' },
        },
        plugins: [username(), oneTimeToken({ expiresIn: 5 }), ...(stripePlugin ? [stripePlugin] : [])],
    });
}

/** Better Auth CLI expects `export const auth = betterAuth(...)` (an instance, not a factory). */
export const auth = createAuth({
    databaseUrl: process.env.DATABASE_URL ?? '',
    secret: process.env.BETTER_AUTH_SECRET,
    baseUrl: process.env.BETTER_AUTH_BASE_URL,
    clientAppUrl: process.env.CLIENT_APP_URL ?? 'http://localhost:3000',
    cookieDomain: process.env.AUTH_COOKIE_DOMAIN,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    githubClientId: process.env.GITHUB_CLIENT_ID,
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    getSubscriptionPlans: async () => [],
});
