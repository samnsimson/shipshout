import { ApiClient, ChannelCatalogItemDto, PatchRepositoryChannelDto, RepositoryChannelDto } from '@shipshout/api-client';

export type { ChannelCatalogItemDto, PatchRepositoryChannelDto, RepositoryChannelDto };

export type ChannelKind = ChannelCatalogItemDto['kind'];

export type RepositoryChannelTone = RepositoryChannelDto['tone'];

export class ChannelsApi {
    static async fetchCatalog() {
        return ApiClient.fetchProtected((api) => api.listChannels());
    }

    static async fetchRepositoryChannels(repositoryId: string) {
        return ApiClient.fetchProtected((api) => api.listRepositoryChannels({ path: { id: repositoryId } }));
    }

    static async updateRepositoryChannels(repositoryId: string, channels: PatchRepositoryChannelDto[]) {
        return ApiClient.fetchProtected((api) => api.updateRepositoryChannels({ path: { id: repositoryId }, body: { channels } }));
    }
}
