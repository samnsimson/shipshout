import { ShoutoutDetailResponseDto, ShoutoutDispatchLogDto, ShoutoutDraftDto, ShoutoutResponseDto, ShoutoutStatusResponseDto } from '@shipshout/api-client';
import { ApiClientFactory } from '@/lib/api/api-client.factory';

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
        return ApiClientFactory.fetchProtected((api) => api.listShoutouts());
    }

    static async fetchById(id: string) {
        return ApiClientFactory.fetchProtected((api) => api.getShoutout({ path: { id } }));
    }

    static async updateDraft(shoutoutId: string, channelKey: string, draft: { title: string; body: string }) {
        return ApiClientFactory.fetchProtected((api) => api.updateShoutoutDraft({ path: { id: shoutoutId, channelKey }, body: draft }));
    }

    static async publish(shoutoutId: string) {
        return ApiClientFactory.fetchProtected((api) => api.publishShoutout({ path: { id: shoutoutId } }));
    }

    static async retryGeneration(shoutoutId: string) {
        return ApiClientFactory.fetchProtected((api) => api.retryShoutoutGeneration({ path: { id: shoutoutId } }));
    }

    static async streamEvents(id: string) {
        return ApiClientFactory.fetchProtected((api) => api.shoutoutControllerStreamEvents({ path: { id }, parseAs: 'stream' }));
    }
}
