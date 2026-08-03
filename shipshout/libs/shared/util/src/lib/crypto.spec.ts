import { encryptSecret, decryptSecret } from './crypto.js';

const KEY = Buffer.alloc(32, 1).toString('base64');
beforeAll(() => {
  process.env.APP_ENCRYPTION_KEY = KEY;
});

describe('crypto', () => {
  it('round-trips a secret', () => {
    const ct = encryptSecret('gho_token');
    expect(ct).not.toContain('gho_token');
    expect(decryptSecret(ct)).toBe('gho_token');
  });
  it('produces different ciphertext each call (random IV)', () => {
    expect(encryptSecret('x')).not.toBe(encryptSecret('x'));
  });
});
