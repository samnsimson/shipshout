import { ENTITIES } from '../typeorm.config';
import { Repository } from './repository.entity';
import { BrandProfile, Tone } from './brand-profile.entity';
import { ReleaseEvent, ReleaseEventStatus, SourceProvider } from './release-event.entity';

describe('ingestion entities', () => {
    it('registers entities', () => {
        expect(ENTITIES).toEqual(expect.arrayContaining([Repository, BrandProfile, ReleaseEvent]));
    });
    it('exposes enums', () => {
        expect(ReleaseEventStatus.Received).toBe('received');
        expect(SourceProvider.Github).toBe('github');
        expect(Tone.DevFocused).toBe('dev_focused');
    });
});
