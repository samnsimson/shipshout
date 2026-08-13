import { cookies } from 'next/headers';
import { ApiClient, HeyApiConfigUtils } from '@shipshout/api-client';

export type ShipshoutRequestOptions = {
    baseUrl: string;
    headers: Record<string, string>;
};

export class ShipshoutApi {
    static normalizeBaseUrl(baseUrl: string): string {
        return HeyApiConfigUtils.normalizeBaseUrl(baseUrl);
    }

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
            .map((c) => `${c.name}=${c.value}`)
            .join('; ');
        const clientAppUrl = this.clientAppUrl();
        const headers: Record<string, string> = {
            origin: clientAppUrl,
            referer: `${clientAppUrl}/`,
        };
        if (cookieHeader) headers.Cookie = cookieHeader;

        if (initHeaders) {
            const extra = new Headers(initHeaders);
            extra.forEach((value, key) => {
                headers[key] = value;
            });
        }

        return headers;
    }

    static async fetch(path: string, init?: RequestInit): Promise<Response> {
        const headers = await this.buildRequestHeaders(init?.headers);
        return fetch(`${this.apiBaseUrl()}${path}`, {
            ...init,
            headers,
            cache: 'no-store',
        });
    }

    static async fetchJson<T>(path: string, init?: RequestInit): Promise<{ data?: T; error?: unknown; status: number }> {
        const response = await this.fetch(path, init);
        if (response.status === 204) return { status: response.status };

        const body = await response.json().catch(() => null);
        if (!response.ok) return { error: body, status: response.status };
        return { data: body as T, status: response.status };
    }

    static async getRequestOptions(): Promise<ShipshoutRequestOptions> {
        return {
            baseUrl: this.apiBaseUrl(),
            headers: await this.buildRequestHeaders(),
        };
    }

    static async getApiClientOptions() {
        const requestOptions = await this.getRequestOptions();
        return {
            baseUrl: requestOptions.baseUrl,
            headers: requestOptions.headers,
            cache: 'no-store' as const,
            responseStyle: 'fields' as const,
            throwOnError: false as const,
        };
    }

    static async getApiClient() {
        return { api: new ApiClient(), requestOptions: await this.getApiClientOptions() };
    }

    static errorMessage(error: unknown, fallback: string): string {
        if (error && typeof error === 'object' && 'message' in error) {
            const message = (error as { message?: unknown }).message;
            if (typeof message === 'string' && message) return message;
            if (Array.isArray(message) && message.length > 0) return message.join('; ');
        }
        return fallback;
    }
}
