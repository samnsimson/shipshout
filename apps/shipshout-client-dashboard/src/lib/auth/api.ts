import { cookies } from 'next/headers';
import { collectSetCookieHeaders, parseSetCookie } from './cookies';

export function getApiBaseUrl(): string {
    const url = process.env.SHIPSHOUT_API_URL;
    if (!url) throw new Error('SHIPSHOUT_API_URL is not set');
    return url.replace(/\/$/, '');
}

export function getPublicApiBaseUrl(): string {
    const url = process.env.NEXT_PUBLIC_SHIPSHOUT_API_URL ?? process.env.SHIPSHOUT_API_URL;
    if (!url) throw new Error('NEXT_PUBLIC_SHIPSHOUT_API_URL is not set');
    return url.replace(/\/$/, '');
}

export async function authFetch(path: string, init?: RequestInit): Promise<Response> {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
        .getAll()
        .map((c) => `${c.name}=${c.value}`)
        .join('; ');

    return fetch(`${getApiBaseUrl()}${path}`, {
        ...init,
        headers: {
            'content-type': 'application/json',
            ...(cookieHeader ? { cookie: cookieHeader } : {}),
            ...(init?.headers ?? {}),
        },
        cache: 'no-store',
    });
}

export async function applySetCookies(response: Response): Promise<void> {
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

export async function readErrorMessage(response: Response): Promise<string> {
    try {
        const body = (await response.json()) as { message?: string | string[] };
        if (Array.isArray(body.message)) return body.message.join('; ');
        if (typeof body.message === 'string' && body.message) return body.message;
    } catch {
        // ignore
    }
    return `Request failed (${response.status})`;
}
