import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { AuthOptions } from './contracts/types/auth.types';
import { EmailAdapter } from './email/email-adapter';
import { LoggingEmailAdapter } from './email/logging-email.adapter';

export function createAuth(opts: AuthOptions, emailAdapter: EmailAdapter = new LoggingEmailAdapter()) {
    const socialProviders: {
        google?: { clientId: string; clientSecret: string };
        github?: { clientId: string; clientSecret: string };
    } = {};

    if (opts.googleClientId && opts.googleClientSecret) {
        socialProviders.google = { clientId: opts.googleClientId, clientSecret: opts.googleClientSecret };
    }
    if (opts.githubClientId && opts.githubClientSecret) {
        socialProviders.github = { clientId: opts.githubClientId, clientSecret: opts.githubClientSecret };
    }

    return betterAuth({
        secret: opts.secret,
        baseURL: opts.baseUrl,
        basePath: '/auth-service',
        emailAndPassword: {
            enabled: true,
            sendResetPassword: async ({ user, url }) => {
                await emailAdapter.send({
                    to: user.email,
                    subject: 'Reset your password',
                    text: url,
                    html: `<p>Reset your password:</p><p><a href="${url}">${url}</a></p>`,
                });
            },
        },
        experimental: { joins: true },
        database: new Pool({ connectionString: opts.databaseUrl, options: '-c search_path=auth' }),
        socialProviders,
    });
}

/** Better Auth CLI expects `export const auth = betterAuth(...)` (an instance, not a factory). */
export const auth = createAuth({
    databaseUrl: process.env.DATABASE_URL ?? '',
    secret: process.env.BETTER_AUTH_SECRET,
    baseUrl: process.env.BETTER_AUTH_BASE_URL,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    githubClientId: process.env.GITHUB_CLIENT_ID,
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
});
