import { ShoutoutStatus } from '@shipshout/database';
import { ShoutoutStatusUtils } from '../utils/shoutout-status.utils';

describe('ShoutoutStatusUtils', () => {
    it('allows generating to ready_for_review', () => {
        expect(ShoutoutStatusUtils.canTransition('generating', 'ready_for_review')).toBe(true);
    });

    it('allows generating to generation_failed', () => {
        expect(ShoutoutStatusUtils.canTransition('generating', 'generation_failed')).toBe(true);
    });

    it('allows ready_for_review to publishing', () => {
        expect(ShoutoutStatusUtils.canTransition('ready_for_review', 'publishing')).toBe(true);
    });

    it('allows publishing to published, partially_published, failed, or ready_for_review', () => {
        expect(ShoutoutStatusUtils.canTransition('publishing', 'published')).toBe(true);
        expect(ShoutoutStatusUtils.canTransition('publishing', 'partially_published')).toBe(true);
        expect(ShoutoutStatusUtils.canTransition('publishing', 'failed')).toBe(true);
        expect(ShoutoutStatusUtils.canTransition('publishing', 'ready_for_review')).toBe(true);
    });

    it('allows generation_failed to generating', () => {
        expect(ShoutoutStatusUtils.canTransition('generation_failed', 'generating')).toBe(true);
    });

    it('rejects invalid transitions', () => {
        expect(ShoutoutStatusUtils.canTransition('published', 'publishing')).toBe(false);
        expect(ShoutoutStatusUtils.canTransition('ready_for_review', 'published')).toBe(false);
    });

    it('rejects transitions from terminal states', () => {
        const terminal: ShoutoutStatus[] = ['published', 'partially_published', 'failed'];
        for (const from of terminal) {
            expect(ShoutoutStatusUtils.canTransition(from, 'generating')).toBe(false);
        }
    });
});
