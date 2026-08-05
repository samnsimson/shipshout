import { createHmac } from 'crypto';
import { verifyGithubSignature } from './verify-signature.js';

describe('verifyGithubSignature', () => {
    const secret = 's3cret';
    const body = Buffer.from(JSON.stringify({ a: 1 }));
    const sig = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
    it('accepts a valid signature', () => expect(verifyGithubSignature(body, sig, secret)).toBe(true));
    it('rejects a tampered body', () => expect(verifyGithubSignature(Buffer.from('x'), sig, secret)).toBe(false));
});
