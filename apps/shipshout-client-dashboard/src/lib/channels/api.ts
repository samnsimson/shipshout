import {
    type ChannelCatalogItemDto,
    type PatchRepositoryChannelDto,
    type RepositoryChannelDto,
} from '@shipshout/api-client';
import { refreshAccessTokenAction } from '../auth/actions';
import { ShipshoutApiUtils, shipshoutFetch } from '../shipshout-api';

export type { ChannelCatalogItemDto, PatchRepositoryChannelDto, RepositoryChannelDto };

export type ChannelKind = ChannelCatalogItemDto['kind'];

export type RepositoryChannelTone = RepositoryChannelDto['tone'];

async function fetchWithAuthRetry<T>(path: string): Promise<{ data?: T; error?: unknown; status: number }> {
    let result = await shipshoutFetch<T>(path);
    if (result.status !== 401) return result;

    const refreshed = await refreshAccessTokenAction();
    if (!refreshed) return result;

    return shipshoutFetch<T>(path);
}

export async function getChannelsApi() {
    return ShipshoutApiUtils.getApiClient();
}

export async function fetchChannelCatalog() {
    return fetchWithAuthRetry<{ channels: ChannelCatalogItemDto[] }>('/channels');
}

export async function fetchRepositoryChannels(repositoryId: string) {
    const { api, requestOptions } = await getChannelsApi();
    let result = await api.listRepositoryChannels({ ...requestOptions, path: { id: repositoryId } });

    if (result.response?.status === 401) {
        const refreshed = await refreshAccessTokenAction();
        if (refreshed) {
            const retryOptions = await ShipshoutApiUtils.getApiClientOptions();
            result = await api.listRepositoryChannels({ ...retryOptions, path: { id: repositoryId } });
        }
    }

    return { data: result.data, error: result.error, status: result.response?.status ?? (result.error ? 500 : 200) };
}
