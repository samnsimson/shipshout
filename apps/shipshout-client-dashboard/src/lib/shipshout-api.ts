import { cookies } from 'next/headers';
import { ApiClient } from '@shipshout/api-client';

export type ShipshoutRequestOptions = {
    baseUrl: string;
    headers: Record<string, string>;
};

export class ShipshoutApiUtils {
    static normalizeBaseUrl(baseUrl: string): string {
        return baseUrl.replace(/\/$/, '');
    }

    static clientAppUrl(): string {
        return (process.env.CLIENT_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    }

    static async requestHeaders(): Promise<Record<string, string>> {
        const cookieStore = await cookies();
        const cookieHeader = cookieStore
            .getAll()
            .map((c) => `${c.name}=${c.value}`)
            .join('; ');
        const clientAppUrl = this.clientAppUrl();
        return {
            Cookie: cookieHeader,
            origin: clientAppUrl,
            referer: `${clientAppUrl}/`,
        };
    }

    static async getRequestOptions(): Promise<ShipshoutRequestOptions> {
        const baseUrl = process.env.SHIPSHOUT_API_URL;
        if (!baseUrl) throw new Error('SHIPSHOUT_API_URL is not set');
        return {
            baseUrl: this.normalizeBaseUrl(baseUrl),
            headers: await this.requestHeaders(),
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

export async function getShipshoutRequestOptions(): Promise<ShipshoutRequestOptions> {
    return ShipshoutApiUtils.getRequestOptions();
}

export async function shipshoutFetch<T>(path: string, init?: RequestInit): Promise<{ data?: T; error?: unknown; status: number }> {
    const { baseUrl, headers } = await getShipshoutRequestOptions();
    const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
            ...headers,
            ...(init?.headers ?? {}),
        },
        cache: 'no-store',
    });

    if (response.status === 204) return { status: response.status };

    const body = await response.json().catch(() => null);
    if (!response.ok) return { error: body, status: response.status };
    return { data: body as T, status: response.status };
}
