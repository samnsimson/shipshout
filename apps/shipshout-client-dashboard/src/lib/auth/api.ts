import { cookies } from 'next/headers';
import { AuthCookieUtils } from './auth-cookie.utils';

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

function getClientAppUrl(): string {
    return (process.env.CLIENT_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export async function authFetch(path: string, init?: RequestInit): Promise<Response> {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
        .getAll()
        .map((c) => `${c.name}=${c.value}`)
        .join('; ');

    // Better Auth originCheck requires Origin/Referer when cookies are present (server actions omit them by default).
    const clientAppUrl = getClientAppUrl();

    return fetch(`${getApiBaseUrl()}${path}`, {
        ...init,
        headers: {
            'content-type': 'application/json',
            origin: clientAppUrl,
            referer: clientAppUrl,
            ...(cookieHeader ? { cookie: cookieHeader } : {}),
            ...(init?.headers ?? {}),
        },
        cache: 'no-store',
    });
}

export async function applySetCookies(response: Response): Promise<void> {
    await AuthCookieUtils.applyToCookieStore(response);
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
