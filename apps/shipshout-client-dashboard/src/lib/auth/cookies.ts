export const AUTH_TOKEN_COOKIE_NAMES = ['auth_token', '__Secure-auth_token'] as const;
export const AUTH_REFRESH_COOKIE_NAMES = ['auth_refresh', '__Secure-auth_refresh'] as const;

export type AuthActionResult = { ok: true } | { ok: false; error: string };

export type ParsedSetCookie = {
    name: string;
    value: string;
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    maxAge?: number;
    expires?: Date;
};

export function hasAuthCookies(request: { cookies: { has: (name: string) => boolean } }): boolean {
    return [...AUTH_TOKEN_COOKIE_NAMES, ...AUTH_REFRESH_COOKIE_NAMES].some((name) => request.cookies.has(name));
}

/** Parse a single Set-Cookie header value into name/value/attrs (Domain intentionally dropped). */
export function parseSetCookie(header: string): ParsedSetCookie | null {
    const parts = header.split(';').map((part) => part.trim());
    const [nameValue, ...attrs] = parts;
    if (!nameValue) return null;
    const eq = nameValue.indexOf('=');
    if (eq <= 0) return null;
    const name = nameValue.slice(0, eq).trim();
    const value = nameValue.slice(eq + 1).trim();
    const parsed: ParsedSetCookie = { name, value, path: '/' };

    for (const attr of attrs) {
        const [rawKey, ...rawRest] = attr.split('=');
        const key = rawKey?.trim().toLowerCase();
        const val = rawRest.join('=').trim();
        if (!key) continue;
        if (key === 'domain') continue;
        if (key === 'path') parsed.path = val || '/';
        else if (key === 'httponly') parsed.httpOnly = true;
        else if (key === 'secure') parsed.secure = true;
        else if (key === 'samesite') {
            const lower = val.toLowerCase();
            if (lower === 'lax' || lower === 'strict' || lower === 'none') parsed.sameSite = lower;
        } else if (key === 'max-age') {
            const n = Number(val);
            if (!Number.isNaN(n)) parsed.maxAge = n;
        } else if (key === 'expires') {
            const d = new Date(val);
            if (!Number.isNaN(d.getTime())) parsed.expires = d;
        }
    }

    return parsed;
}

export function collectSetCookieHeaders(response: Response): string[] {
    const headers = response.headers as Headers & { getSetCookie?: () => string[] };
    if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
    const single = response.headers.get('set-cookie');
    return single ? [single] : [];
}
