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

    static async fetchCatalog() {
        return ChannelsApi.withAuthRetry((api, requestOptions) => api.listChannels(requestOptions));
    }

    static async fetchRepositoryChannels(repositoryId: string) {
        return ChannelsApi.withAuthRetry((api, requestOptions) => api.listRepositoryChannels({ ...requestOptions, path: { id: repositoryId } }));
    }

    static async updateRepositoryChannels(repositoryId: string, channels: PatchRepositoryChannelDto[]) {
        const { api, requestOptions } = await ChannelsApi.getClient();
        return api.updateRepositoryChannels({ ...requestOptions, path: { id: repositoryId }, body: { channels } });
    }

    private static async withAuthRetry<TResult extends { response?: Response }>(
        call: (api: Awaited<ReturnType<typeof ShipshoutApi.getApiClient>>['api'], requestOptions: Awaited<ReturnType<typeof ShipshoutApi.getApiClientOptions>>) => Promise<TResult>,
    ): Promise<TResult> {
        const { api, requestOptions } = await ChannelsApi.getClient();
        let result = await call(api, requestOptions);

        if (result.response?.status === 401) {
            const refreshed = await AuthActions.refreshAccessToken();
            if (refreshed) {
                const retryOptions = await ShipshoutApi.getApiClientOptions();
                result = await call(api, retryOptions);
            }
        }

        return result;
    }
}
