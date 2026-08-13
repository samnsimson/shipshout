import { ShipshoutApi } from '@/lib/shipshout.api';
import { AuthUtils } from './auth.utils';

export class AuthApi {
    static apiBaseUrl(): string {
        return ShipshoutApi.apiBaseUrl();
    }

    static publicApiBaseUrl(): string {
        const url = process.env.NEXT_PUBLIC_SHIPSHOUT_API_URL ?? process.env.SHIPSHOUT_API_URL;
        if (!url) throw new Error('NEXT_PUBLIC_SHIPSHOUT_API_URL is not set');
        return url.replace(/\/$/, '');
    }

    static fetch(path: string, init?: RequestInit): Promise<Response> {
        return ShipshoutApi.fetch(path, {
            ...init,
            headers: {
                'content-type': 'application/json',
                ...(init?.headers ?? {}),
            },
        });
    }

    static applySetCookies(response: Response): Promise<void> {
        return AuthUtils.applyToCookieStore(response);
    }

    static async readErrorMessage(response: Response): Promise<string> {
        try {
            const body = await AuthApi.parseJsonResponse<{ message?: string | string[] }>(response);
            if (!body) return `Request failed (${response.status})`;
            if (Array.isArray(body.message)) return body.message.join('; ');
            if (typeof body.message === 'string' && body.message) return body.message;
        } catch {
            // ignore
        }
        return `Request failed (${response.status})`;
    }

    static async parseJsonResponse<T>(response: Response): Promise<T | null> {
        const text = await response.text();
        if (!text.trim()) return null;
        try {
            return JSON.parse(text) as T;
        } catch {
            return null;
        }
    }
}
