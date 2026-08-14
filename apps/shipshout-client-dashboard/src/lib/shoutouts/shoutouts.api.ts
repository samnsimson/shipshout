import { ApiClient, ShoutoutDetailResponseDto, ShoutoutDispatchLogDto, ShoutoutDraftDto, ShoutoutResponseDto, ShoutoutStatusResponseDto } from '@shipshout/api-client';

export type ShoutoutDto = ShoutoutResponseDto;

export type ShoutoutDetailDto = ShoutoutDetailResponseDto;

export type { ShoutoutDraftDto, ShoutoutDispatchLogDto, ShoutoutStatusResponseDto };

export type ShoutoutStreamEvent = {
    status: string;
    channelKey?: string;
    error?: string;
};

export class ShoutoutsApi {
    static async fetchAll() {
        return ApiClient.fetchProtected((api) => api.listShoutouts());
    }

    static async fetchById(id: string) {
        return ApiClient.fetchProtected((api) => api.getShoutout({ path: { id } }));
    }

    static async updateDraft(shoutoutId: string, channelKey: string, draft: { title: string; body: string }) {
        return ApiClient.fetchProtected((api) => api.updateShoutoutDraft({ path: { id: shoutoutId, channelKey }, body: draft }));
    }

    static async regenerateDraft(shoutoutId: string, channelKey: string, userPrompt?: string) {
        const body = userPrompt ? { userPrompt } : undefined;
        return ApiClient.fetchProtected((api) => api.regenerateShoutoutDraft({ path: { id: shoutoutId, channelKey }, body }));
    }

    static async publish(shoutoutId: string) {
        return ApiClient.fetchProtected((api) => api.publishShoutout({ path: { id: shoutoutId } }));
    }

    static async retryGeneration(shoutoutId: string) {
        return ApiClient.fetchProtected((api) => api.retryShoutoutGeneration({ path: { id: shoutoutId } }));
    }

    static async streamEvents(id: string) {
        return ApiClient.fetchProtected((api) => api.shoutoutControllerStreamEvents({ path: { id }, parseAs: 'stream' }));
    }
}
