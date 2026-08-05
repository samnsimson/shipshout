import { ENTITIES } from '../typeorm.config';
import { Draft, DraftStatus, Channel } from './draft.entity';

describe('Draft entity', () => {
    it('is registered', () => expect(ENTITIES).toContain(Draft));
    it('has statuses and channels', () => {
        expect(DraftStatus.PendingReview).toBe('pending_review');
        expect(Channel.X).toBe('x');
        expect(Channel.LinkedIn).toBe('linkedin');
        expect(Channel.Email).toBe('email');
    });
});
