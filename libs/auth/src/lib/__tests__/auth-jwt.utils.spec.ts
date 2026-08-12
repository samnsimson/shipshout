jest.mock('jose', () => ({
    createRemoteJWKSet: jest.fn(),
    jwtVerify: jest.fn(),
}));

import type { Response } from 'express';
import { AuthJwtUtils } from '../utils/auth-jwt.utils';

describe('AuthJwtUtils', () => {
    it('parseSessionTokenFromHeaders reads BA session cookie value', () => {
        const headers = new Headers();
        headers.append('set-cookie', 'better-auth.session_token=sess_abc; Path=/; HttpOnly');
        expect(AuthJwtUtils.parseSessionTokenFromHeaders(headers)).toBe('sess_abc');
    });

    it('applyAuthTokens sets auth cookies and does not forward BA session cookie', () => {
        const appended: string[] = [];
        const res = { append: (_k: string, v: string) => appended.push(v) } as unknown as Response;
        AuthJwtUtils.applyAuthTokens(res, { accessToken: 'jwt.access', refreshToken: 'sess.refresh' }, { baseUrl: 'http://localhost:8000' });
        expect(appended.some((c) => c.startsWith('auth_token=jwt.access'))).toBe(true);
        expect(appended.some((c) => c.startsWith('auth_refresh=sess.refresh'))).toBe(true);
        expect(appended.some((c) => c.includes('better-auth.session_token'))).toBe(false);
    });

    it('extractAccessToken prefers Bearer header over cookie', () => {
        const req = {
            headers: { authorization: 'Bearer header.jwt' },
            cookies: { auth_token: 'cookie.jwt' },
        };
        expect(AuthJwtUtils.extractAccessToken(req)).toBe('header.jwt');
    });

    it('clearAuthTokens expires both auth cookies', () => {
        const appended: string[] = [];
        const res = { append: (_k: string, v: string) => appended.push(v) } as unknown as Response;
        AuthJwtUtils.clearAuthTokens(res, { baseUrl: 'http://localhost:8000' });
        expect(appended.some((c) => c.startsWith('auth_token=;') || c.includes('auth_token=; Max-Age=0'))).toBe(true);
        expect(appended.some((c) => c.startsWith('auth_refresh=;') || c.includes('auth_refresh=; Max-Age=0'))).toBe(true);
    });
});
