import { cookies } from 'next/headers';
import { ApiClient, createClient, createClientConfig, createConfig, HeyApiConfigUtils } from '@shipshout/api-client';
import { AuthUtils } from '@/lib/auth/auth.utils';

export class ApiClientFactory {
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
        const allCookies = cookieStore.getAll();
        const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join('; ');
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
    static async fetchPublic<TResult>(call: (api: ApiClient) => Promise<TResult>): Promise<TResult> {
        const apiClient = await this.createApiClient();
        return call(apiClient);
    }

    /** Authenticated routes — single 401 → refresh → retry. Do not use for auth endpoints or SSE. */
    static async fetchProtected<TResult extends { response?: Response }>(call: (api: ApiClient) => Promise<TResult>): Promise<TResult> {
        let apiClient = await this.createApiClient();
        const result = await call(apiClient);
        if (result.response?.status !== 401) return result;
        const refreshed = await this.refreshSession(apiClient);
        if (!refreshed) return result;
        apiClient = await this.createApiClient();
        return call(apiClient);
    }

    private static async createApiClient(): Promise<ApiClient> {
        const client = await this.createHttpClient();
        return new ApiClient({ client });
    }

    private static async createHttpClient(extraHeaders?: Record<string, string>) {
        const authHeaders = await this.buildRequestHeaders(extraHeaders);
        const client = createClient(createClientConfig(createConfig({ baseUrl: this.apiBaseUrl() })));
        client.interceptors.request.use(async (opts: { headers: Headers }) => {
            for (const [key, value] of Object.entries(authHeaders)) opts.headers.set(key, value);
        });

        return client;
    }

    private static async refreshSession(apiClient: ApiClient): Promise<boolean> {
        const result = await apiClient.authControllerRefresh();
        if (result.error || !result.response?.ok) return false;
        await AuthUtils.applyToCookieStore(result.response);
        return true;
    }
}
