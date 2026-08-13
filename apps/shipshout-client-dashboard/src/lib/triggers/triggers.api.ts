import { LinkedRepositoryDetailResponseDto, TriggerEventResponseDto } from '@shipshout/api-client';
import { ShipshoutApi } from '@/lib/shipshout.api';

export type LinkedRepositoryDetailDto = LinkedRepositoryDetailResponseDto;

export type TriggerEventDto = TriggerEventResponseDto;

export type RepositoryTriggersDto = LinkedRepositoryDetailDto['triggers'];

export class TriggersApi {
    static getClient() {
        return ShipshoutApi.getApiClient();
    }

    static async fetchRepositoryDetail(id: string) {
        const { api, requestOptions } = await TriggersApi.getClient();
        return api.getLinkedRepositoryDetail({ ...requestOptions, path: { id } });
    }

    static async fetchRepositoryEvents(id: string, limit = 20) {
        const { api, requestOptions } = await TriggersApi.getClient();
        return api.listRepositoryTriggerEvents({ ...requestOptions, path: { id }, query: { limit: String(limit) } });
    }

    static async updateRepositoryTriggers(repositoryId: string, triggers: RepositoryTriggersDto) {
        const { api, requestOptions } = await TriggersApi.getClient();
        return api.updateRepositoryTriggers({ ...requestOptions, path: { id: repositoryId }, body: triggers });
    }
}
