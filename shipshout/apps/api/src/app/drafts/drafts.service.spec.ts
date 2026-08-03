import { DraftsService } from './drafts.service';
import { DraftStatus } from '@shipshout/database';

function repo(seed: any[] = []) {
    const store = [...seed];
    return {
        store,
        listForWorkspace: jest.fn(async () => store),
        findInWorkspace: jest.fn(async (_ws: string, id: string) => store.find((d) => d.id === id)),
        findOne: jest.fn(async ({ where }: any) => store.find((d) => d.id === where.id)),
        create: (d: any) => d,
        save: jest.fn(async (d: any) => {
            const i = store.findIndex((x) => x.id === d.id);
            if (i >= 0) store[i] = d;
            else store.push(d);
            return d;
        }),
    };
}

describe('DraftsService', () => {
    const queue = { add: jest.fn() };

    it('updates edited copy', async () => {
        const drafts = repo([{ id: 'd1', generatedCopy: 'g', status: DraftStatus.PendingReview }]);
        const svc = new DraftsService(drafts as any, queue as any);
        const d = await svc.updateCopy('w1', 'd1', { editedCopy: 'new' });
        expect(d.editedCopy).toBe('new');
    });

    it('approve sets status Approved', async () => {
        const drafts = repo([{ id: 'd1', status: DraftStatus.PendingReview }]);
        const svc = new DraftsService(drafts as any, queue as any);
        const d = await svc.approve('w1', 'd1');
        expect(d.status).toBe(DraftStatus.Approved);
    });

    it('rejects publishing a non-approved draft', async () => {
        const drafts = repo([{ id: 'd1', status: DraftStatus.PendingReview }]);
        const svc = new DraftsService(drafts as any, queue as any);
        await expect(svc.publish('w1', 'd1')).rejects.toThrow(/approved/i);
        expect(queue.add).not.toHaveBeenCalled();
    });

    it('enqueues dispatch for an approved draft', async () => {
        const drafts = repo([{ id: 'd1', status: DraftStatus.Approved }]);
        const svc = new DraftsService(drafts as any, queue as any);
        await svc.publish('w1', 'd1');
        expect(queue.add).toHaveBeenCalledWith('dispatch', { draftId: 'd1' });
    });
});
