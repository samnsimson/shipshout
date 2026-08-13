import {
    type ShoutoutDetailResponseDto,
    type ShoutoutDispatchLogDto,
    type ShoutoutDraftDto,
    type ShoutoutResponseDto,
    type ShoutoutStatusResponseDto,
} from '@shipshout/api-client';
import { ShipshoutApiUtils } from '@/lib/shipshout-api';

export type ShoutoutDto = ShoutoutResponseDto;

export type ShoutoutDetailDto = ShoutoutDetailResponseDto;

export type { ShoutoutDraftDto, ShoutoutDispatchLogDto, ShoutoutStatusResponseDto };

export type ShoutoutStreamEvent = {
    status: string;
    channelKey?: string;
    error?: string;
};

export async function getShoutoutsApi() {
    return ShipshoutApiUtils.getApiClient();
}

export async function fetchShoutouts() {
    const { api, requestOptions } = await getShoutoutsApi();
    const result = await api.listShoutouts(requestOptions);
    return { data: result.data, error: result.error, status: result.response?.status ?? (result.error ? 500 : 200) };
}

export async function fetchShoutout(id: string) {
    const { api, requestOptions } = await getShoutoutsApi();
    const result = await api.getShoutout({ ...requestOptions, path: { id } });
    return { data: result.data, error: result.error, status: result.response?.status ?? (result.error ? 500 : 200) };
}
