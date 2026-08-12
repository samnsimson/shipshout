import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { createHmac, timingSafeEqual } from 'node:crypto';

export class WebhookSecretUtils {
    static generateSecret(): string {
        return randomBytes(32).toString('hex');
    }

    static generateDeliveryToken(): string {
        return randomBytes(24).toString('hex');
    }

    static encrypt(plaintext: string, encryptionKey: string): string {
        const key = createHash('sha256').update(encryptionKey).digest();
        const iv = randomBytes(12);
        const cipher = createCipheriv('aes-256-gcm', key, iv);
        const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return Buffer.concat([iv, tag, encrypted]).toString('base64');
    }

    static decrypt(ciphertext: string, encryptionKey: string): string {
        const buffer = Buffer.from(ciphertext, 'base64');
        const iv = buffer.subarray(0, 12);
        const tag = buffer.subarray(12, 28);
        const encrypted = buffer.subarray(28);
        const key = createHash('sha256').update(encryptionKey).digest();
        const decipher = createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    }

    static verifySignature(rawBody: Buffer, secret: string, signatureHeader: string | undefined): boolean {
        if (!signatureHeader?.startsWith('sha256=')) return false;
        const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
        const received = signatureHeader.slice('sha256='.length);
        if (expected.length !== received.length) return false;
        return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
    }
}
