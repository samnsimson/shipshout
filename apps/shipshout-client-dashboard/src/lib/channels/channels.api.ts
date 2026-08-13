import { ChannelCatalogItemDto, PatchRepositoryChannelDto, RepositoryChannelDto } from '@shipshout/api-client';
import { AuthActions } from '@/lib/auth/auth.actions';
import { ShipshoutApi } from '@/lib/shipshout.api';

export type { ChannelCatalogItemDto, PatchRepositoryChannelDto, RepositoryChannelDto };

export type ChannelKind = ChannelCatalogItemDto['kind'];

export type RepositoryChannelTone = RepositoryChannelDto['tone'];

export class ChannelsApi {
    static getClient() {
        return ShipshoutApi.getApiClient();
    }

    static fetchCatalog() {
        return ChannelsApi.fetchWithAuthRetry<{ channels: ChannelCatalogItemDto[] }>('/channels');
    }

    static async fetchRepositoryChannels(repositoryId: string) {
        const { api, requestOptions } = await ChannelsApi.getClient();
        let result = await api.listRepositoryChannels({ ...requestOptions, path: { id: repositoryId } });

        if (result.response?.status === 401) {
            const refreshed = await AuthActions.refreshAccessToken();
            if (refreshed) {
                const retryOptions = await ShipshoutApi.getApiClientOptions();
                result = await api.listRepositoryChannels({ ...retryOptions, path: { id: repositoryId } });
            }
        }

        return { data: result.data, error: result.error, status: result.response?.status ?? (result.error ? 500 : 200) };
    }

    private static async fetchWithAuthRetry<T>(path: string): Promise<{ data?: T; error?: unknown; status: number }> {
        let result = await ShipshoutApi.fetchJson<T>(path);
        if (result.status !== 401) return result;

        const refreshed = await AuthActions.refreshAccessToken();
        if (!refreshed) return result;

        return ShipshoutApi.fetchJson<T>(path);
    }
}
