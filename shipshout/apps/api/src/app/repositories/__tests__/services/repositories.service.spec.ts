import { ReleaseEvent, ReleaseEventStatus } from '@shipshout/database';
import { ReleaseEventRepository } from '../../webhooks/repositories/release-event.repository';
import { RepositoriesService } from '../../services/repositories.service';

describe('RepositoriesService.list', () => {
    it('returns lastReleaseAt and lastReleaseStatus when events exist', async () => {
        const repos = {
            listForWorkspace: jest.fn(async () => [{ id: 'r1', provider: 'github', name: 'org/repo', enabled: true }]),
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
    });

    it('returns null release fields when no events', async () => {
        const repos = {
            listForWorkspace: jest.fn(async () => [{ id: 'r1', provider: 'github', name: 'org/repo', enabled: true }]),
        };
        const events = { findLatestByRepositoryIds: jest.fn(async () => new Map()) };
        const svc = new RepositoriesService(repos as any, { assertCanAddRepo: jest.fn() } as any, events as any);
        const res = await svc.list('w1');
        expect(res[0].lastReleaseAt).toBeNull();
        expect(res[0].lastReleaseStatus).toBeNull();
    });
});
