import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { AuthOptions } from './contracts/types/auth.types';
import { AuthUtils } from './utils/auth-http';
import { username } from 'better-auth/plugins';

export function createAuth(opts: AuthOptions) {
    return betterAuth({
        secret: opts.secret,
        baseURL: opts.baseUrl,
        basePath: '/auth-service',
        experimental: { joins: true },
        database: new Pool({ connectionString: opts.databaseUrl, options: '-c search_path=auth' }),
        emailAndPassword: {
            enabled: true,
            requireEmailVerification: true,
            sendResetPassword: async ({ user, url }) => AuthUtils.sendResetPasswordEmail(user, url),
        },
        emailVerification: {
            sendVerificationEmail: async ({ user, token }) => {
                const base = opts.clientAppUrl.replace(/\/$/, '');
                const url = `${base}/verify-email?token=${encodeURIComponent(token)}`;
                await AuthUtils.sendVerificationEmail(user, url);
            },
            autoSignInAfterVerification: false,
        },
        socialProviders: {
            google: { clientId: opts.googleClientId ?? '', clientSecret: opts.googleClientSecret ?? '' },
            github: { clientId: opts.githubClientId ?? '', clientSecret: opts.githubClientSecret ?? '' },
        },
        plugins: [username()],
    });
}

/** Better Auth CLI expects `export const auth = betterAuth(...)` (an instance, not a factory). */
export const auth = createAuth({
    databaseUrl: process.env.DATABASE_URL ?? '',
    secret: process.env.BETTER_AUTH_SECRET,
    baseUrl: process.env.BETTER_AUTH_BASE_URL,
    clientAppUrl: process.env.CLIENT_APP_URL ?? 'http://localhost:3000',
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    githubClientId: process.env.GITHUB_CLIENT_ID,
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
});
