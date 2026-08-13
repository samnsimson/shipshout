import type { CreateClientConfig } from './lib/client/client.gen.js';

export class HeyApiConfigUtils {
    static normalizeBaseUrl(baseUrl: string): string {
        return baseUrl.replace(/\/$/, '');
    }

    static defaultBaseUrl(): string {
        return this.normalizeBaseUrl(process.env.SHIPSHOUT_API_URL ?? 'http://localhost:8000');
    }
}

export const createClientConfig: CreateClientConfig = (config) => ({
    ...config,
    baseUrl: HeyApiConfigUtils.defaultBaseUrl(),
    cache: 'no-store',
    responseStyle: 'fields',
    throwOnError: false,
});
