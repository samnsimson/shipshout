import { createHmac } from 'node:crypto';
import { WebhookSecretUtils } from '../utils/webhook-secret.utils';

describe('WebhookSecretUtils', () => {
    it('encrypts and decrypts secrets', () => {
        const secret = 'test-secret';
        const encrypted = WebhookSecretUtils.encrypt(secret, 'encryption-key');
        expect(WebhookSecretUtils.decrypt(encrypted, 'encryption-key')).toBe(secret);
    });

    it('verifies valid signatures', () => {
        const rawBody = Buffer.from('{"hello":"world"}');
        const secret = 'hook-secret';
        const digest = createHmac('sha256', secret).update(rawBody).digest('hex');
        expect(WebhookSecretUtils.verifySignature(rawBody, secret, `sha256=${digest}`)).toBe(true);
    });

    it('rejects invalid signatures', () => {
        const rawBody = Buffer.from('{"hello":"world"}');
        expect(WebhookSecretUtils.verifySignature(rawBody, 'hook-secret', 'sha256=deadbeef')).toBe(false);
    });
});
