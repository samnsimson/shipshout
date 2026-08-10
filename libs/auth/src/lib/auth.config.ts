import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { AuthOptions } from './contracts/types/auth.types';

export function createAuth(opts: AuthOptions) {
    return betterAuth({
        secret: opts.secret,
        baseURL: opts.baseUrl,
        emailAndPassword: { enabled: true },
        experimental: { joins: true },
        database: new Pool({ connectionString: opts.databaseUrl, options: '-c search_path=auth' }),
        socialProviders: {
            google: { clientId: opts.googleClientId ?? '', clientSecret: opts.googleClientSecret ?? '' },
            github: { clientId: opts.githubClientId ?? '', clientSecret: opts.githubClientSecret ?? '' },
        },
    });
}

/** Better Auth CLI expects `export const auth = betterAuth(...)` (an instance, not a factory). */
export const auth = createAuth({
    databaseUrl: process.env.DATABASE_URL ?? '',
    secret: process.env.BETTER_AUTH_SECRET,
    baseUrl: process.env.AUTH_BASE_URL,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    githubClientId: process.env.GITHUB_CLIENT_ID,
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
});
