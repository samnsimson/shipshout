import { ENTITIES } from '../../config/typeorm.config.js';
import { Repository } from '../../entities/repository.entity.js';
import { BrandProfile, Tone } from '../../entities/brand-profile.entity.js';
import { ReleaseEvent, ReleaseEventStatus, SourceProvider } from '../../entities/release-event.entity.js';

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
