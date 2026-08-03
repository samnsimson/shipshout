import { createHmac, timingSafeEqual } from 'crypto';

export function verifyGithubSignature(
  rawBody: Buffer,
  signatureHeader: string,
  secret: string,
): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
