import { cookies } from 'next/headers';
import { createClientConfig, HeyApiConfigUtils } from './hey-api.config.js';
import { createClient } from './lib/client/client/client.gen.js';
import { createConfig } from './lib/client/client/utils.gen.js';
import { ApiSdk } from './lib/client/sdk.gen.js';

type ParsedSetCookie = {
    name: string;
    value: string;
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    maxAge?: number;
    expires?: Date;
};

export class ApiClient {
    static clientAppUrl(): string {
        return (process.env.CLIENT_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    }

    static apiBaseUrl(): string {
        const baseUrl = process.env.SHIPSHOUT_API_URL;
        if (!baseUrl) throw new Error('SHIPSHOUT_API_URL is not set');
        return HeyApiConfigUtils.normalizeBaseUrl(baseUrl);
    }

    static async buildRequestHeaders(initHeaders?: HeadersInit): Promise<Record<string, string>> {
        const cookieStore = await cookies();
        const cookieHeader = cookieStore
            .getAll()
            .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
            .join('; ');
        const clientAppUrl = this.clientAppUrl();
        const headers: Record<string, string> = { origin: clientAppUrl, referer: `${clientAppUrl}/` };
        if (cookieHeader) headers.Cookie = cookieHeader;
        if (initHeaders) {
            const extra = new Headers(initHeaders);
            extra.forEach((value, key) => (headers[key] = value));
        }

        return headers;
    }

    /** Public / unauthenticated routes — no 401 refresh retry (login, register, refresh, etc.). */
    static async fetchPublic<TResult>(call: (api: ApiSdk) => Promise<TResult>): Promise<TResult> {
        const api = await this.createSdk();
        return call(api);
    }

    /** Authenticated routes — single 401 → refresh → retry. Do not use for auth endpoints that must not recurse. */
    static async fetchProtected<TResult extends { response?: Response }>(call: (api: ApiSdk) => Promise<TResult>): Promise<TResult> {
        let api = await this.createSdk();
        const result = await call(api);
        if (result.response?.status !== 401) return result;

        const refreshed = await this.refreshSession(api);
        if (!refreshed) return result;

        api = await this.createSdk();
        return call(api);
    }

    private static async createSdk(): Promise<ApiSdk> {
        const client = await this.createHttpClient();
        return new ApiSdk({ client });
    }

    private static async createHttpClient(extraHeaders?: Record<string, string>) {
        const authHeaders = await this.buildRequestHeaders(extraHeaders);
        const client = createClient(createClientConfig(createConfig({ baseUrl: this.apiBaseUrl() })));
        client.interceptors.request.use(async (opts: { headers: Headers }) => {
            for (const [key, value] of Object.entries(authHeaders)) opts.headers.set(key, value);
        });

        return client;
    }

    private static async refreshSession(api: ApiSdk): Promise<boolean> {
        const result = await api.authControllerRefresh();
        if (result.error || !result.response?.ok) return false;
        await this.applySetCookies(result.response);
        return true;
    }

    private static async applySetCookies(response: Response): Promise<void> {
        const cookieStore = await cookies();
        for (const header of this.collectSetCookieHeaders(response)) {
            const parsed = this.parseSetCookie(header);
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

    private static collectSetCookieHeaders(response: Response): string[] {
        const headers = response.headers as Headers & { getSetCookie?: () => string[] };
        if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
        const single = response.headers.get('set-cookie');
        return single ? [single] : [];
    }

    private static parseSetCookie(header: string): ParsedSetCookie | null {
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
}
