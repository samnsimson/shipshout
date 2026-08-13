import { collectSetCookieHeaders, parseSetCookie } from '@/lib/auth/cookies';

describe('parseSetCookie', () => {
    it('parses name value and attrs without Domain', () => {
        const parsed = parseSetCookie('auth_token=abc; Path=/; HttpOnly; SameSite=Lax; Domain=api.example.com');
        expect(parsed).toEqual({
            name: 'auth_token',
            value: 'abc',
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
        });
    });

    it('returns null for invalid header', () => {
        expect(parseSetCookie('')).toBeNull();
        expect(parseSetCookie('novalue')).toBeNull();
    });
});

describe('collectSetCookieHeaders', () => {
    it('uses getSetCookie when available', () => {
        const headers = new Headers();
        const response = {
            headers: {
                getSetCookie: () => ['a=1', 'b=2'],
                get: headers.get.bind(headers),
            },
        } as unknown as Response;
        expect(collectSetCookieHeaders(response)).toEqual(['a=1', 'b=2']);
    });
});
