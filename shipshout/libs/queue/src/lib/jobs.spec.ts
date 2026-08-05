import { QUEUES } from './queue.constants.js';
import type { GenerateJob, DispatchJob } from './jobs.js';

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
