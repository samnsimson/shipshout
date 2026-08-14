import { createHash, randomBytes } from 'node:crypto';

export function hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
}

export function generateRawToken(): string {
    return randomBytes(32).toString('hex');
}
