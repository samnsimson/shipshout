import { ShoutoutTitleUtils } from '../utils/shoutout-title.utils';

describe('ShoutoutTitleUtils', () => {
    it('derives release titles', () => {
        expect(
            ShoutoutTitleUtils.deriveTitle('release', { release: { tag_name: 'v1.2.0' } }, 'acme/app'),
        ).toBe('Release v1.2.0 — acme/app');
    });

    it('derives tag titles', () => {
        expect(ShoutoutTitleUtils.deriveTitle('tag_push', { ref: 'v1.2.0' }, 'acme/app')).toBe('Tag v1.2.0 — acme/app');
    });

    it('derives branch push titles', () => {
        expect(ShoutoutTitleUtils.deriveTitle('branch_push', { ref: 'refs/heads/main' }, 'acme/app')).toBe('Push to main — acme/app');
    });
});
