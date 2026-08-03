import { DraftsService } from './drafts.service';
import { DraftStatus } from '@shipshout/data-entities';

function repo(seed: any[] = []) {
  const store = [...seed];
  return {
    store,
    find: jest.fn(async () => store),
    findOne: jest.fn(async ({ where }: any) => store.find((d) => d.id === where.id)),
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
});
