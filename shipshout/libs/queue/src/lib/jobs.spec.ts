import { QUEUES } from './queue.constants';
import { GenerateJob, DispatchJob } from './jobs';

describe('queue contracts', () => {
    it('defines queue names', () => {
        expect(QUEUES.generate).toBe('generate');
        expect(QUEUES.dispatch).toBe('dispatch');
    });
    it('types compile', () => {
        const g: GenerateJob = { releaseEventId: 'r1' };
        const d: DispatchJob = { draftId: 'd1' };
        expect(g.releaseEventId).toBe('r1');
        expect(d.draftId).toBe('d1');
    });
});
