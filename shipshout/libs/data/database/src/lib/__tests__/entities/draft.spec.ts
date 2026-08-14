import { ENTITIES } from '../../config/typeorm.config.js';
import { Draft, DraftStatus, Channel } from '../../entities/draft.entity.js';

describe('Draft entity', () => {
    it('is registered', () => expect(ENTITIES).toContain(Draft));
    it('has statuses and channels', () => {
        expect(DraftStatus.PendingReview).toBe('pending_review');
        expect(Channel.X).toBe('x');
        expect(Channel.LinkedIn).toBe('linkedin');
        expect(Channel.Email).toBe('email');
    });
});
