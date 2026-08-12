import { cookies } from 'next/headers';
import {
    ApiClient,
    type ChannelCatalogItemDto,
    type PatchRepositoryChannelDto,
    type RepositoryChannelDto,
} from '@shipshout/api-client';

export type { ChannelCatalogItemDto, PatchRepositoryChannelDto, RepositoryChannelDto };

export type ChannelKind = ChannelCatalogItemDto['kind'];

export type RepositoryChannelTone = RepositoryChannelDto['tone'];

function normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/$/, '');
}

export async function getChannelsApi() {
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

export async function fetchChannelCatalog() {
    const { api, requestOptions } = await getChannelsApi();
    const result = await api.listChannels(requestOptions);
    return { data: result.data, error: result.error, status: result.response?.status ?? (result.error ? 500 : 200) };
}

export async function fetchRepositoryChannels(repositoryId: string) {
    const { api, requestOptions } = await getChannelsApi();
    const result = await api.listRepositoryChannels({ ...requestOptions, path: { id: repositoryId } });
    return { data: result.data, error: result.error, status: result.response?.status ?? (result.error ? 500 : 200) };
}
