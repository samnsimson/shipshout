import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

function key(): Buffer {
    const k = Buffer.from(process.env.APP_ENCRYPTION_KEY ?? '', 'base64');
    if (k.length !== 32) throw new Error('APP_ENCRYPTION_KEY must be 32 bytes base64');
    return k;
}

export function encryptSecret(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key(), iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

export function decryptSecret(ciphertext: string): string {
    const [ivB64, tagB64, dataB64] = ciphertext.split('.');
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}
