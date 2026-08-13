import { ShoutoutDetailResponseDto, ShoutoutDispatchLogDto, ShoutoutDraftDto, ShoutoutResponseDto, ShoutoutStatusResponseDto } from '@shipshout/api-client';
import { ShipshoutApi } from '@/lib/shipshout.api';

export type ShoutoutDto = ShoutoutResponseDto;

export type ShoutoutDetailDto = ShoutoutDetailResponseDto;

export type { ShoutoutDraftDto, ShoutoutDispatchLogDto, ShoutoutStatusResponseDto };

export type ShoutoutStreamEvent = {
    status: string;
    channelKey?: string;
    error?: string;
};

export class ShoutoutsApi {
    static getClient() {
        return ShipshoutApi.getApiClient();
    }

    static async fetchAll() {
        const { api, requestOptions } = await ShoutoutsApi.getClient();
        return api.listShoutouts(requestOptions);
    }

    static async fetchById(id: string) {
        const { api, requestOptions } = await ShoutoutsApi.getClient();
        return api.getShoutout({ ...requestOptions, path: { id } });
    }

    static async updateDraft(shoutoutId: string, channelKey: string, draft: { title: string; body: string }) {
        const { api, requestOptions } = await ShoutoutsApi.getClient();
        return api.updateShoutoutDraft({ ...requestOptions, path: { id: shoutoutId, channelKey }, body: draft });
    }

    static async publish(shoutoutId: string) {
        const { api, requestOptions } = await ShoutoutsApi.getClient();
        return api.publishShoutout({ ...requestOptions, path: { id: shoutoutId } });
    }

    static async retryGeneration(shoutoutId: string) {
        const { api, requestOptions } = await ShoutoutsApi.getClient();
        return api.retryShoutoutGeneration({ ...requestOptions, path: { id: shoutoutId } });
    }
}
