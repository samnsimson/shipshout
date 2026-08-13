import { ApiClient, LinkedRepositoryDetailResponseDto, TriggerEventResponseDto } from '@shipshout/api-client';

export type LinkedRepositoryDetailDto = LinkedRepositoryDetailResponseDto;

export type TriggerEventDto = TriggerEventResponseDto;

export type RepositoryTriggersDto = LinkedRepositoryDetailDto['triggers'];

export class TriggersApi {
    static async fetchRepositoryDetail(id: string) {
        return ApiClient.fetchProtected((api) => api.getLinkedRepositoryDetail({ path: { id } }));
    }

    static async fetchRepositoryEvents(id: string, limit = 20) {
        return ApiClient.fetchProtected((api) => api.listRepositoryTriggerEvents({ path: { id }, query: { limit: String(limit) } }));
    }

    static async updateRepositoryTriggers(repositoryId: string, triggers: RepositoryTriggersDto) {
        return ApiClient.fetchProtected((api) => api.updateRepositoryTriggers({ path: { id: repositoryId }, body: triggers }));
    }
}
