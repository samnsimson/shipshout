import { timingSafeEqual } from 'crypto';

export function verifyJiraSecret(provided: string, expected: string): boolean {
    const a = Buffer.from(provided ?? '');
    const b = Buffer.from(expected ?? '');
    return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}
