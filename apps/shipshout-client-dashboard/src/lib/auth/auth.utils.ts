import { cookies } from 'next/headers';
import type { AuthUserDto } from '@shipshout/api-client';
import type { NextResponse } from 'next/server';

export type AuthActionResult = { ok: true } | { ok: false; error: string };

export type SessionUser = {
    id: string;
    email: string;
    name: string;
    username?: string | null;
    image?: string | null;
};

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

export class AuthUtils {
    static readonly AUTH_TOKEN_COOKIE_NAMES = ['auth_token', '__Secure-auth_token'] as const;
    static readonly AUTH_REFRESH_COOKIE_NAMES = ['auth_refresh', '__Secure-auth_refresh'] as const;

    static normalizeSessionUser(user: AuthUserDto): SessionUser {
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            username: AuthUtils.asString(user.username) ?? AuthUtils.asString(user.displayUsername),
            image: AuthUtils.asString(user.image),
        };
    }

    private static asString(value: unknown): string | null {
        return typeof value === 'string' && value ? value : null;
    }

    static hasAuthCookies(request: { cookies: { has: (name: string) => boolean } }): boolean {
        return [...AuthUtils.AUTH_TOKEN_COOKIE_NAMES, ...AuthUtils.AUTH_REFRESH_COOKIE_NAMES].some((name) => request.cookies.has(name));
    }

    static parseSetCookie(header: string): ParsedSetCookie | null {
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

    static collectSetCookieHeaders(response: Response): string[] {
        const headers = response.headers as Headers & { getSetCookie?: () => string[] };
        if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
        const single = response.headers.get('set-cookie');
        return single ? [single] : [];
    }

    static async applyToCookieStore(response: Response): Promise<void> {
        const cookieStore = await cookies();
        for (const header of AuthUtils.collectSetCookieHeaders(response)) {
            const parsed = AuthUtils.parseSetCookie(header);
            if (!parsed) continue;
            cookieStore.set({
                name: parsed.name,
                value: parsed.value,
                path: parsed.path ?? '/',
                httpOnly: parsed.httpOnly,
                secure: parsed.secure,
                sameSite: parsed.sameSite,
                maxAge: parsed.maxAge,
                expires: parsed.expires,
            });
        }
    }

    static clearFromNextResponse(target: NextResponse): void {
        for (const name of [...AuthUtils.AUTH_TOKEN_COOKIE_NAMES, ...AuthUtils.AUTH_REFRESH_COOKIE_NAMES]) target.cookies.delete(name);
    }

    static async clearFromCookieStore(): Promise<void> {
        const cookieStore = await cookies();
        for (const name of [...AuthUtils.AUTH_TOKEN_COOKIE_NAMES, ...AuthUtils.AUTH_REFRESH_COOKIE_NAMES]) cookieStore.delete(name);
    }

    static applyToNextResponse(target: NextResponse, response: Response): void {
        for (const header of AuthUtils.collectSetCookieHeaders(response)) {
            const parsed = AuthUtils.parseSetCookie(header);
            if (!parsed) continue;
            target.cookies.set({
                name: parsed.name,
                value: parsed.value,
                path: parsed.path ?? '/',
                httpOnly: parsed.httpOnly,
                secure: parsed.secure,
                sameSite: parsed.sameSite,
                maxAge: parsed.maxAge,
                expires: parsed.expires,
            });
        }
    }
}
