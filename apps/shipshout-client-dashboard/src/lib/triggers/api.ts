import { shipshoutFetch } from '@/lib/shipshout-api';

export type RepositoryTriggersDto = {
    release: boolean;
    tagPush: boolean;
    branchPush: boolean;
};

export type WebhookManualSetupDto = {
    url: string;
    secret: string;
    instructions: string;
};

export type RepositoryWebhookStatusDto = {
    status: 'pending' | 'active' | 'manual_required' | 'error' | 'not_configured';
    lastDeliveryAt: string | null;
    lastError: string | null;
    manualSetup: WebhookManualSetupDto | null;
};

export type LinkedRepositoryDetailDto = {
    id: string;
    githubId: number;
    fullName: string;
    name: string;
    owner: string;
    defaultBranch: string;
    private: boolean;
    htmlUrl: string;
    linkedAt: string;
    triggers: RepositoryTriggersDto;
    activeTriggerCount: number;
    webhook: RepositoryWebhookStatusDto;
};

export type TriggerEventDto = {
    id: string;
    eventType: string;
    triggerType: string;
    summary: string;
    status: string;
    shoutoutId: string | null;
    createdAt: string;
};

export async function fetchRepositoryDetail(id: string) {
    return shipshoutFetch<LinkedRepositoryDetailDto>(`/repositories/${id}`);
}

export async function fetchRepositoryEvents(id: string, limit = 20) {
    return shipshoutFetch<{ events: TriggerEventDto[] }>(`/repositories/${id}/events?limit=${limit}`);
}
