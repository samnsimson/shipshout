import { createHmac } from 'crypto';
import { WebhooksService } from '../../services/webhooks.service';

process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');

function make() {
    const secret = 's3cret';
    const body = Buffer.from(JSON.stringify({ repository: { id: 42 }, release: { id: 999, name: 'v1', body: 'fix' } }));
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
            'x-github-event': 'release',
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
            'x-github-event': 'release',
        });
        expect(res.duplicate).toBe(true);
        expect(events.save).not.toHaveBeenCalled();
    });

    it('accepts signatures verified with the GitHub App webhook secret', async () => {
        const appSecret = 'app-webhook-secret';
        process.env.GITHUB_APP_WEBHOOK_SECRET = appSecret;
        const body = Buffer.from(JSON.stringify({ repository: { id: 42 }, release: { id: 1, name: 'v1', body: 'fix' } }));
        const repos = {
            findByExternalId: jest.fn(async () => ({ id: 'r1', enabled: true, webhookSecret: 'cipher', workspace: { id: 'w1' } })),
            decryptSecret: jest.fn(() => 'wrong-per-repo-secret'),
        };
        const events = {
            findByDeliveryId: jest.fn(async () => null),
            create: (d: any) => d,
            save: jest.fn(async (d: any) => ({ id: 'e1', ...d })),
        };
        const queue = { add: jest.fn(async () => ({})) };
        const tiers = { tryConsumeRelease: jest.fn(async () => true), sourceIntegrationsAllowed: jest.fn(async () => true) };
        const svc = new WebhooksService(repos as any, events as any, tiers as any, queue as any);
        const sig = 'sha256=' + createHmac('sha256', appSecret).update(body).digest('hex');
        const res = await svc.handleGithub(body, {
            'x-hub-signature-256': sig,
            'x-github-delivery': 'd2',
            'x-github-event': 'release',
        });
        expect(res.accepted).toBe(true);
        delete process.env.GITHUB_APP_WEBHOOK_SECRET;
    });
});
