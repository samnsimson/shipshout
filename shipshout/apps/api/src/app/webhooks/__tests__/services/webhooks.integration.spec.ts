import { createHmac } from 'crypto';
import { createTestDataSource, truncateAll, Repository as RepoEntity, ReleaseEvent } from '@shipshout/database';
import { ConnectedRepoRepository } from '../../../repositories/repositories/connected-repo.repository';
import { RepositoriesService } from '../../../repositories/services/repositories.service';
import { ReleaseEventRepository } from '../../repositories/release-event.repository';
import { WebhooksService } from '../../services/webhooks.service';

process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');

const hasTestDb = !!process.env.TEST_DATABASE_URL;

(hasTestDb ? describe : describe.skip)('webhook ingestion (integration)', () => {
    let ds: Awaited<ReturnType<typeof createTestDataSource>>;
    let repos: RepositoriesService;
    let events: ReleaseEventRepository;
    let queue: { add: jest.Mock };
    let tier: {
        tryConsumeRelease: () => Promise<boolean>;
        sourceIntegrationsAllowed: () => Promise<boolean>;
        assertCanAddRepo: () => Promise<void>;
    };

    let installationSync: {
        reconcileWorkspace: jest.Mock;
        handleInstallation: jest.Mock;
        handleInstallationRepositories: jest.Mock;
    };

    beforeAll(async () => {
        ds = await createTestDataSource();
        const connectedRepo = new ConnectedRepoRepository(ds.getRepository(RepoEntity));
        tier = {
            tryConsumeRelease: async () => true,
            sourceIntegrationsAllowed: async () => true,
            assertCanAddRepo: async () => undefined,
        };
        installationSync = {
            reconcileWorkspace: jest.fn(async () => undefined),
            handleInstallation: jest.fn(),
            handleInstallationRepositories: jest.fn(),
        };
        events = new ReleaseEventRepository(ds.getRepository(ReleaseEvent));
        repos = new RepositoriesService(connectedRepo, tier as any, events, installationSync as any);
        queue = { add: jest.fn(async () => ({})) };
    });

    afterAll(async () => {
        await ds.destroy();
    });

    beforeEach(async () => {
        await truncateAll(ds);
        queue.add.mockClear();
    });

    it('persists once and dedupes duplicate deliveries', async () => {
        const ws = await ds.query(`INSERT INTO workspaces(name,slug,plan) VALUES ('w','w-${Date.now()}','starter') RETURNING id`);
        const { webhookSecret } = await repos.create(ws[0].id, { provider: 'github', externalId: '42', name: 'acme/app' });
        const svc = new WebhooksService(repos, events, tier as any, installationSync as any, queue as any);
        const body = Buffer.from(JSON.stringify({ repository: { id: 42 }, release: { id: 999, name: 'v1', body: 'fix' } }));
        const sig = 'sha256=' + createHmac('sha256', webhookSecret).update(body).digest('hex');
        const first = await svc.handleGithub(body, { 'x-hub-signature-256': sig, 'x-github-delivery': 'd1' });
        const second = await svc.handleGithub(body, { 'x-hub-signature-256': sig, 'x-github-delivery': 'd1' });
        expect(first.duplicate).toBe(false);
        expect(second.duplicate).toBe(true);
        const count = await events.count();
        expect(count).toBe(1);
    });
});
