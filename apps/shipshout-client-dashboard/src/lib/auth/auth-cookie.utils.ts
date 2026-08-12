import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { collectSetCookieHeaders, parseSetCookie } from './cookies';

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
