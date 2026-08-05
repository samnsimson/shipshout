import { DispatchService } from './dispatch.service';
import { Channel, DraftStatus, PublishStatus } from '@shipshout/database';

function deps(publishImpl: () => Promise<any>) {
    const draft = {
        id: 'd1',
        channel: Channel.X,
        generatedCopy: 'g',
        editedCopy: 'e',
        status: DraftStatus.Approved,
        releaseEvent: { repository: { workspace: { id: 'w1' } } },
    };
    const drafts = {
        findOneBy: jest.fn(async () => draft),
        save: jest.fn(async (d: any) => d),
    };
    const records = { create: (d: any) => d, save: jest.fn(async (d: any) => d) };
    const registry = { get: jest.fn(() => ({ channel: Channel.X, publish: publishImpl })) };
    const connections = {
        getActive: jest.fn(async () => ({ id: 'c1' })),
        getActiveAccessToken: jest.fn(async () => 'tok'),
    };
    return { draft, drafts, records, registry, connections };
}

describe('DispatchService.dispatch', () => {
    it('publishes and records success', async () => {
        const d = deps(async () => ({ externalUrl: 'https://x.com/1' }));
        const svc = new DispatchService(d.drafts as any, d.records as any, d.registry as any, d.connections as any);
        await svc.dispatch('d1');
        expect(d.records.save).toHaveBeenCalledWith(expect.objectContaining({ status: PublishStatus.Success, externalUrl: 'https://x.com/1' }));
        expect(d.draft.status).toBe(DraftStatus.Published);
    });

    it('records failure and marks draft failed', async () => {
        const d = deps(async () => {
            throw new Error('rate limited');
        });
        const svc = new DispatchService(d.drafts as any, d.records as any, d.registry as any, d.connections as any);
        await expect(svc.dispatch('d1')).rejects.toThrow();
        expect(d.records.save).toHaveBeenCalledWith(expect.objectContaining({ status: PublishStatus.Failed }));
    });
});
