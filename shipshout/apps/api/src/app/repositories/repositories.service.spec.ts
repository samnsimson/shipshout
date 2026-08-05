import { RepositoriesService } from './repositories.service';

process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');

describe('RepositoriesService.create', () => {
    it('stores an encrypted secret and returns plaintext once', async () => {
        const repo = {
            create: (d: any) => d,
            save: jest.fn(async (d: any) => ({ id: 'r1', ...d })),
        };
        const tiers = { assertCanAddRepo: jest.fn(async () => undefined) };
        const svc = new RepositoriesService(repo as any, tiers as any);
        const { repository, webhookSecret } = await svc.create('w1', {
            provider: 'github',
            externalId: '42',
            name: 'acme/app',
        });
        expect(webhookSecret).toHaveLength(64);
        expect(repository.webhookSecret).not.toBe(webhookSecret);
    });
});
