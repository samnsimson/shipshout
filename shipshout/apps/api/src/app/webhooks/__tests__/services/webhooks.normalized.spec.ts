import { WebhooksService } from '../../services/webhooks.service';
import { SourceProvider } from '@shipshout/database';

function make(tierAllows: boolean, dup = false) {
    const repos = { findByExternalId: jest.fn(async () => ({ id: 'r1', enabled: true, workspace: { id: 'w1' } })) };
    const events = {
        findByDeliveryId: jest.fn(async () => (dup ? { id: 'e1' } : null)),
        create: (d: any) => d,
        save: jest.fn(async (d: any) => ({ id: 'e1', ...d })),
    };
    const queue = { add: jest.fn(async () => ({})) };
    const tiers = { tryConsumeRelease: jest.fn(async () => true), sourceIntegrationsAllowed: jest.fn(async () => tierAllows) };
    const installationSync = { handleInstallation: jest.fn(), handleInstallationRepositories: jest.fn() };
    const svc = new WebhooksService(repos as any, events as any, tiers as any, installationSync as any, queue as any);
    return { svc, events, queue };
}

describe('WebhooksService.ingestNormalized', () => {
    it('rejects Linear source when tier lacks source integrations', async () => {
        const { svc, queue } = make(false);
        const res = await svc.ingestNormalized({
            source: SourceProvider.Linear,
            externalId: 'x',
            commitSummary: 's',
            deliveryId: 'd1',
            verified: true,
            requireSourceIntegration: true,
        });
        expect(res.accepted).toBe(false);
        expect(queue.add).not.toHaveBeenCalled();
    });
    it('accepts and enqueues when verified + allowed', async () => {
        const { svc, events, queue } = make(true);
        const res = await svc.ingestNormalized({
            source: SourceProvider.Linear,
            externalId: 'x',
            commitSummary: 's',
            deliveryId: 'd1',
            verified: true,
            requireSourceIntegration: true,
        });
        expect(res.accepted).toBe(true);
        expect(events.save).toHaveBeenCalled();
        expect(queue.add).toHaveBeenCalledWith('generate', { releaseEventId: 'e1' });
    });
});
