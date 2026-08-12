import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { AUTH_REFRESH_COOKIE_NAMES, AUTH_TOKEN_COOKIE_NAMES, collectSetCookieHeaders, parseSetCookie } from './cookies';

export class AuthCookieUtils {
    /** Apply upstream Set-Cookie headers onto the Next.js cookie store (Server Action / Route Handler only). */
    static async applyToCookieStore(response: Response): Promise<void> {
        const cookieStore = await cookies();
        for (const header of collectSetCookieHeaders(response)) {
            const parsed = parseSetCookie(header);
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

    /** Clear auth cookies from a NextResponse (Route Handlers). */
    static clearFromNextResponse(target: NextResponse): void {
        for (const name of [...AUTH_TOKEN_COOKIE_NAMES, ...AUTH_REFRESH_COOKIE_NAMES]) target.cookies.delete(name);
    }

    /** Clear auth cookies from the Next.js cookie store (Server Action / Route Handler only). */
    static async clearFromCookieStore(): Promise<void> {
        const cookieStore = await cookies();
        for (const name of [...AUTH_TOKEN_COOKIE_NAMES, ...AUTH_REFRESH_COOKIE_NAMES]) cookieStore.delete(name);
    }

    /** Apply upstream Set-Cookie headers onto a NextResponse (Route Handlers). */
    static applyToNextResponse(target: NextResponse, response: Response): void {
        for (const header of collectSetCookieHeaders(response)) {
            const parsed = parseSetCookie(header);
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
