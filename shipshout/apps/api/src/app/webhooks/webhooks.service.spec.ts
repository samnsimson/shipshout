import { createHmac } from 'crypto';
import { WebhooksService } from './webhooks.service';

process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');

function make() {
    const secret = 's3cret';
    const body = Buffer.from(JSON.stringify({ release: { id: 42, name: 'v1', body: 'fix' } }));
    const repos = {
        findByExternalId: jest.fn(async () => ({ id: 'r1', enabled: true, webhookSecret: 'cipher', workspace: { id: 'w1' } })),
        decryptSecret: jest.fn(() => secret),
    };
    const events = {
        findByDeliveryId: jest.fn(async () => null),
        create: (d: any) => d,
        save: jest.fn(async (d: any) => ({ id: 'e1', ...d })),
    };
    const queue = { add: jest.fn(async () => ({})) };
    const tiers = { tryConsumeRelease: jest.fn(async () => true), sourceIntegrationsAllowed: jest.fn(async () => true) };
    const svc = new WebhooksService(repos as any, events as any, tiers as any, queue as any);
    const sig = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
    return { svc, body, sig, events, queue };
}

describe('WebhooksService.handleGithub', () => {
    it('persists event and enqueues generate on valid signature', async () => {
        const { svc, body, sig, events, queue } = make();
        const res = await svc.handleGithub(body, {
            'x-hub-signature-256': sig,
            'x-github-delivery': 'd1',
        });
        expect(res.accepted).toBe(true);
        expect(events.save).toHaveBeenCalled();
        expect(queue.add).toHaveBeenCalledWith('generate', { releaseEventId: 'e1' });
    });

    it('is idempotent for duplicate delivery ids', async () => {
        const { svc, body, sig, events } = make();
        (events.findByDeliveryId as jest.Mock).mockResolvedValueOnce({ id: 'e1' });
        const res = await svc.handleGithub(body, {
            'x-hub-signature-256': sig,
            'x-github-delivery': 'd1',
        });
        expect(res.duplicate).toBe(true);
        expect(events.save).not.toHaveBeenCalled();
    });
});

describe('WebhooksService.simulateRelease', () => {
    function make(repoOverrides: Partial<{ id: string; enabled: boolean; workspace: { id: string } }> = {}) {
        const repo = { id: 'r1', enabled: true, workspace: { id: 'w1' }, ...repoOverrides };
        const repos = { findById: jest.fn(async () => repo) };
        const events = {
            findByDeliveryId: jest.fn(async () => null),
            create: (d: any) => d,
            save: jest.fn(async (d: any) => ({ id: 'e1', ...d })),
        };
        const queue = { add: jest.fn(async () => ({})) };
        const tiers = { tryConsumeRelease: jest.fn(async () => true), sourceIntegrationsAllowed: jest.fn(async () => true) };
        const svc = new WebhooksService(repos as any, events as any, tiers as any, queue as any);
        return { svc, events, queue };
    }

    it('queues a synthetic release event for the given repository', async () => {
        const { svc, events, queue } = make();
        const res = await svc.simulateRelease('w1', 'r1', { title: 'v1.0.1', notes: 'Fixed things' });
        expect(res.accepted).toBe(true);
        expect(events.save).toHaveBeenCalledWith(expect.objectContaining({ commitSummary: 'v1.0.1\nFixed things' }));
        expect(queue.add).toHaveBeenCalledWith('generate', { releaseEventId: 'e1' });
    });

    it('fills in defaults when title/notes are omitted', async () => {
        const { svc, events } = make();
        await svc.simulateRelease('w1', 'r1', {});
        const saved = (events.save as jest.Mock).mock.calls[0][0];
        expect(saved.commitSummary).toMatch(/^Test release /);
    });

    it('rejects a repository that belongs to a different workspace', async () => {
        const { svc } = make({ workspace: { id: 'other-ws' } });
        await expect(svc.simulateRelease('w1', 'r1', {})).rejects.toThrow('Repository not found');
    });
});
