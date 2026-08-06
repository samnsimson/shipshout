import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_TTL_SEC = 600;

function encode(payload: object): string {
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decode(token: string): { userId: string; exp: number } | null {
    try {
        const parsed = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
        if (typeof parsed.userId !== 'string' || typeof parsed.exp !== 'number') return null;
        return parsed;
    } catch {
        return null;
    }
}

export function signLinkState(userId: string, secret: string, opts?: { ttlSec?: number }): string {
    const exp = Math.floor(Date.now() / 1000) + (opts?.ttlSec ?? DEFAULT_TTL_SEC);
    const payload = encode({ userId, exp });
    const sig = createHmac('sha256', secret).update(payload).digest('base64url');
    return `${payload}.${sig}`;
}

export function verifyLinkState(token: string, secret: string): { userId: string } | null {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expected = createHmac('sha256', secret).update(payload).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const parsed = decode(payload);
    if (!parsed || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return { userId: parsed.userId };
}
