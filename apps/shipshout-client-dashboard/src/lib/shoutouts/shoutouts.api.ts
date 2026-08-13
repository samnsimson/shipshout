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
        const result = await api.listShoutouts(requestOptions);
        return { data: result.data, error: result.error, status: result.response?.status ?? (result.error ? 500 : 200) };
    }

    static async fetchById(id: string) {
        const { api, requestOptions } = await ShoutoutsApi.getClient();
        const result = await api.getShoutout({ ...requestOptions, path: { id } });
        return { data: result.data, error: result.error, status: result.response?.status ?? (result.error ? 500 : 200) };
    }
}
