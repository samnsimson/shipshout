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

export type ShoutoutDetailDto = ShoutoutDto & {
    sourceSummary: Record<string, unknown>;
    triggerEventId: string;
};

export async function fetchShoutouts() {
    return shipshoutFetch<{ shoutouts: ShoutoutDto[] }>('/shoutouts');
}

export async function fetchShoutout(id: string) {
    return shipshoutFetch<ShoutoutDetailDto>(`/shoutouts/${id}`);
}
