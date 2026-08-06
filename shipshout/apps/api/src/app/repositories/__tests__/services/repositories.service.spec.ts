import { ReleaseEventStatus, WebhookStatus } from '@shipshout/database';
import { RepositoriesService } from '../../services/repositories.service';

describe('RepositoriesService.list', () => {
    it('returns lastReleaseAt and lastReleaseStatus when events exist', async () => {
        const repos = {
            listForWorkspace: jest.fn(async () => [
                { id: 'r1', provider: 'github', name: 'org/repo', enabled: true, webhookStatus: WebhookStatus.Pending },
            ]),
        };
        const events = {
            findLatestByRepositoryIds: jest.fn(async () =>
                new Map([['r1', { createdAt: new Date('2026-08-01T12:00:00.000Z'), status: ReleaseEventStatus.Drafted }]]),
            ),
        };
        const svc = new RepositoriesService(repos as any, { assertCanAddRepo: jest.fn() } as any, events as any);
        const res = await svc.list('w1');
        expect(res[0].lastReleaseAt).toBe('2026-08-01T12:00:00.000Z');
        expect(res[0].lastReleaseStatus).toBe('drafted');
        expect(res[0].webhookStatus).toBe('pending');
    });

    it('returns null release fields when no events', async () => {
        const repos = {
            listForWorkspace: jest.fn(async () => [
                { id: 'r1', provider: 'github', name: 'org/repo', enabled: true, webhookStatus: WebhookStatus.Active },
            ]),
        };
        const events = { findLatestByRepositoryIds: jest.fn(async () => new Map()) };
        const svc = new RepositoriesService(repos as any, { assertCanAddRepo: jest.fn() } as any, events as any);
        const res = await svc.list('w1');
        expect(res[0].lastReleaseAt).toBeNull();
        expect(res[0].lastReleaseStatus).toBeNull();
        expect(res[0].webhookStatus).toBe('active');
    });
});

describe('RepositoriesService.createFromGithub', () => {
    it('sets webhookStatus when provided', async () => {
        const repos = {
            findByExternalIdForWorkspace: jest.fn(async () => null),
            create: jest.fn((d) => d),
            save: jest.fn(async (d) => ({ id: 'r1', ...d })),
        };
        const svc = new RepositoriesService(repos as any, { assertCanAddRepo: jest.fn() } as any, {} as any);
        await svc.createFromGithub('w1', { id: 1, full_name: 'o/r' }, { webhookStatus: WebhookStatus.Active });
        expect(repos.save).toHaveBeenCalledWith(expect.objectContaining({ webhookStatus: WebhookStatus.Active }));
    });
});
