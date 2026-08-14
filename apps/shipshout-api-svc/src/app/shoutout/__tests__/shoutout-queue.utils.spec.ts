import { ShoutoutQueueUtils } from '../utils/shoutout-queue.utils';

describe('ShoutoutQueueUtils', () => {
    it('builds stable generation job ids per shoutout', () => {
        expect(ShoutoutQueueUtils.generationJobId('abc-123')).toBe('gen-abc-123');
    });

    it('builds stable dispatch job ids per shoutout', () => {
        expect(ShoutoutQueueUtils.dispatchJobId('abc-123')).toBe('dispatch-abc-123');
    });
});
