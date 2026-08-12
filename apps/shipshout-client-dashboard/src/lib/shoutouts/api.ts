import { shipshoutFetch } from '../shipshout-api';

export type ShoutoutDto = {
    id: string;
    title: string;
    status: string;
    linkedRepositoryId: string;
    repositoryFullName: string;
    triggerType: string;
    createdAt: string;
};

export type ShoutoutDraftDto = {
    channelKey: string;
    title: string;
    body: string;
    editedAt: string | null;
};

export type ShoutoutDispatchLogDto = {
    channelKey: string;
    status: string;
    error: string | null;
    sentAt: string | null;
};

export type ShoutoutDetailDto = ShoutoutDto & {
    sourceSummary: Record<string, unknown>;
    triggerEventId: string;
    drafts: ShoutoutDraftDto[];
    dispatchLogs: ShoutoutDispatchLogDto[];
};

export type ShoutoutStreamEvent = {
    status: string;
    channelKey?: string;
    error?: string;
};

export type ShoutoutStatusResponseDto = {
    status: string;
};

export async function fetchShoutouts() {
    return shipshoutFetch<{ shoutouts: ShoutoutDto[] }>('/shoutouts');
}

export async function fetchShoutout(id: string) {
    return shipshoutFetch<ShoutoutDetailDto>(`/shoutouts/${id}`);
}
