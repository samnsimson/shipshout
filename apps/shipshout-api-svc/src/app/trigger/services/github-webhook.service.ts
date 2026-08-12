import { Injectable } from '@nestjs/common';
import { GithubWebhookApiUtils, GithubWebhookConfig, GithubWebhookResponse } from '../utils/github-webhook-api.utils';

@Injectable()
export class GithubWebhookService {
    async createRepoWebhook(accessToken: string, owner: string, repo: string, config: GithubWebhookConfig): Promise<GithubWebhookResponse> {
        const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/hooks`;
        return this.request<GithubWebhookResponse>(accessToken, url, 'POST', GithubWebhookApiUtils.buildBody(config));
    }

    async updateRepoWebhook(accessToken: string, owner: string, repo: string, hookId: string, config: GithubWebhookConfig): Promise<GithubWebhookResponse> {
        const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/hooks/${encodeURIComponent(hookId)}`;
        return this.request<GithubWebhookResponse>(accessToken, url, 'PATCH', GithubWebhookApiUtils.buildBody(config));
    }

    async deleteRepoWebhook(accessToken: string, owner: string, repo: string, hookId: string): Promise<void> {
        const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/hooks/${encodeURIComponent(hookId)}`;
        const response = await fetch(url, { method: 'DELETE', headers: GithubWebhookApiUtils.headers(accessToken) });
        if (!response.ok && response.status !== 404) throw new GithubWebhookApiError(response.status, await response.text());
    }

    async listRepoWebhooks(accessToken: string, owner: string, repo: string): Promise<GithubWebhookResponse[]> {
        const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/hooks?per_page=100`;
        return this.request<GithubWebhookResponse[]>(accessToken, url, 'GET', undefined);
    }

    async findRepoWebhookByCallbackUrl(accessToken: string, owner: string, repo: string, callbackUrl: string): Promise<GithubWebhookResponse | null> {
        const hooks = await this.listRepoWebhooks(accessToken, owner, repo);
        return hooks.find((hook) => GithubWebhookApiUtils.hookCallbackUrl(hook) === callbackUrl) ?? null;
    }

    async findShipshoutRepoWebhook(accessToken: string, owner: string, repo: string, apiBaseUrl: string): Promise<GithubWebhookResponse | null> {
        const hooks = await this.listRepoWebhooks(accessToken, owner, repo);
        return hooks.find((hook) => GithubWebhookApiUtils.isShipshoutWebhook(hook, apiBaseUrl)) ?? null;
    }

    private async request<T>(accessToken: string, url: string, method: string, body: unknown): Promise<T> {
        const response = await fetch(url, {
            method,
            headers: GithubWebhookApiUtils.headers(accessToken),
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        if (!response.ok) throw new GithubWebhookApiError(response.status, await response.text());
        if (response.status === 204) return undefined as T;
        const text = await response.text();
        if (!text.trim()) return undefined as T;
        return JSON.parse(text) as T;
    }
}

export class GithubWebhookApiError extends Error {
    constructor(
        readonly status: number,
        readonly body: string,
    ) {
        super(GithubWebhookApiUtils.formatApiError(status, body));
    }
}
