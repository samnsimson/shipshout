import { cookies } from 'next/headers';
import {
    ApiClient,
    type ShoutoutDetailResponseDto,
    type ShoutoutDispatchLogDto,
    type ShoutoutDraftDto,
    type ShoutoutResponseDto,
    type ShoutoutStatusResponseDto,
} from '@shipshout/api-client';

export type ShoutoutDto = ShoutoutResponseDto;

export type ShoutoutDetailDto = ShoutoutDetailResponseDto;

export type { ShoutoutDraftDto, ShoutoutDispatchLogDto, ShoutoutStatusResponseDto };

export type ShoutoutStreamEvent = {
    status: string;
    channelKey?: string;
    error?: string;
};

function normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/$/, '');
}

export async function getShoutoutsApi() {
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

export async function fetchShoutouts() {
    const { api, requestOptions } = await getShoutoutsApi();
    const result = await api.listShoutouts(requestOptions);
    return { data: result.data, error: result.error, status: result.response?.status ?? (result.error ? 500 : 200) };
}

export async function fetchShoutout(id: string) {
    const { api, requestOptions } = await getShoutoutsApi();
    const result = await api.getShoutout({ ...requestOptions, path: { id } });
    return { data: result.data, error: result.error, status: result.response?.status ?? (result.error ? 500 : 200) };
}
