import { cookies } from 'next/headers';
import { ApiClient } from '@shipshout/api-client';

function normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/$/, '');
}

export async function getRepositoriesApi() {
    const baseUrl = process.env.SHIPSHOUT_API_URL;
    if (!baseUrl) throw new Error('SHIPSHOUT_API_URL is not set');

    const cookieStore = await cookies();
    const cookieHeader = cookieStore
        .getAll()
        .map((c) => `${c.name}=${c.value}`)
        .join('; ');

    const api = new ApiClient();

    return {
        api,
        requestOptions: {
            baseUrl: normalizeBaseUrl(baseUrl),
            headers: {
                Cookie: cookieHeader,
            },
            responseStyle: 'fields' as const,
            throwOnError: false as const,
        },
    };
}

