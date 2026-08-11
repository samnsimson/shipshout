import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { oneTimeToken, username } from 'better-auth/plugins';
import { AuthOptions } from './contracts/types/auth.types';
import { AuthUtils } from './utils/auth-http';

export function createAuth(opts: AuthOptions) {
    const clientAppUrl = opts.clientAppUrl.replace(/\/$/, '');
    const useSecureCookies = (opts.baseUrl ?? '').startsWith('https://');
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
        plugins: [username(), oneTimeToken({ expiresIn: 5 })],
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
});
