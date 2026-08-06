import { signLinkState, verifyLinkState } from '../../utils/link-state';

describe('link-state utils', () => {
    it('verifyLinkState returns userId for valid token', () => {
        const token = signLinkState('u1', 'secret');
        expect(verifyLinkState(token, 'secret')).toEqual({ userId: 'u1' });
    });

    it('verifyLinkState rejects expired token', () => {
        const token = signLinkState('u1', 'secret', { ttlSec: -60 });
        expect(verifyLinkState(token, 'secret')).toBeNull();
    });

    it('verifyLinkState rejects bad signature', () => {
        const token = signLinkState('u1', 'secret');
        expect(verifyLinkState(`${token}x`, 'secret')).toBeNull();
    });
});
