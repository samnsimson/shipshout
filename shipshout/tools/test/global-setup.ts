export default async function globalSetup() {
    process.env.TEST_DATABASE_URL ??= 'postgres://test:test@localhost:5435/shipshout_test';
    process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL;
    process.env.REDIS_URL ??= 'redis://localhost:6381';
    process.env.STRIPE_SECRET_KEY ??= 'sk_test_shipshout_e2e';
    process.env.APP_ENCRYPTION_KEY ??= Buffer.alloc(32, 1).toString('base64');
    process.env.GITHUB_CLIENT_ID ??= 'e2e-github-client-id';
    process.env.GITHUB_CLIENT_SECRET ??= 'e2e-github-client-secret';
    process.env.GITHUB_CALLBACK_URL ??= 'http://localhost:3000/api/auth/github/callback';
}
