import { DraftsService } from './drafts.service';
import { DraftStatus } from '@shipshout/data-entities';

describe('DraftsService.publish', () => {
  it('rejects publishing a non-approved draft', async () => {
    const drafts = {
      findOne: jest.fn(async () => ({ id: 'd1', status: DraftStatus.PendingReview })),
    };
    const queue = { add: jest.fn() };
    const svc = new DraftsService(drafts as any, queue as any);
    await expect(svc.publish('w1', 'd1')).rejects.toThrow(/approved/i);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('enqueues dispatch for an approved draft', async () => {
    const drafts = {
      findOne: jest.fn(async () => ({ id: 'd1', status: DraftStatus.Approved })),
    };
    const queue = { add: jest.fn(async () => ({})) };
    const svc = new DraftsService(drafts as any, queue as any);
    await svc.publish('w1', 'd1');
    expect(queue.add).toHaveBeenCalledWith('dispatch', { draftId: 'd1' });
  });
});
