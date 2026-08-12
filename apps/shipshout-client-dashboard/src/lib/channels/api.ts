import { shipshoutFetch } from '../shipshout-api';

export type ChannelKind = 'notify' | 'publish';

export type RepositoryChannelTone = 'professional' | 'dev_focused' | 'hype';

export type ChannelCatalogItemDto = {
    key: string;
    displayName: string;
    description: string;
    kind: ChannelKind;
    configSchema: Record<string, unknown>;
    availableOnPlan: boolean;
};

export type RepositoryChannelDto = ChannelCatalogItemDto & {
    channelKey: string;
    enabled: boolean;
    tone: RepositoryChannelTone;
    config: Record<string, unknown>;
};

export type ChannelCatalogListResponseDto = {
    channels: ChannelCatalogItemDto[];
};

export type RepositoryChannelListResponseDto = {
    channels: RepositoryChannelDto[];
};

export type PatchRepositoryChannelDto = {
    channelKey: string;
    enabled?: boolean;
    tone?: RepositoryChannelTone;
    config?: Record<string, unknown>;
};

export async function fetchChannelCatalog() {
    return shipshoutFetch<ChannelCatalogListResponseDto>('/channels');
}

export async function fetchRepositoryChannels(repositoryId: string) {
    return shipshoutFetch<RepositoryChannelListResponseDto>(`/repositories/${repositoryId}/channels`);
}
