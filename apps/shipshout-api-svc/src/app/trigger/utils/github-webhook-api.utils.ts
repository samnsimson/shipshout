export type GithubWebhookConfig = {
    url: string;
    secret: string;
    events: string[];
};

export type GithubWebhookResponse = {
    id: number;
    url: string;
    events: string[];
    config?: {
        url?: string;
    };
};

export class GithubWebhookApiUtils {
    static headers(accessToken: string): HeadersInit {
        return {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${accessToken}`,
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
        };
    }

    static buildBody(config: GithubWebhookConfig) {
        return {
            name: 'web',
            active: true,
            events: config.events,
            config: {
                url: config.url,
                content_type: 'json',
                secret: config.secret,
                insecure_ssl: '0',
            },
        };
    }

    static hookCallbackUrl(hook: GithubWebhookResponse): string | null {
        return hook.config?.url ?? null;
    }

    static isShipshoutWebhook(hook: GithubWebhookResponse, apiBaseUrl: string): boolean {
        const callbackUrl = GithubWebhookApiUtils.hookCallbackUrl(hook);
        if (!callbackUrl) return false;
        const base = apiBaseUrl.replace(/\/$/, '');
        return callbackUrl.startsWith(`${base}/webhooks/github/`);
    }

    static formatApiError(status: number, body: string): string {
        try {
            const parsed = JSON.parse(body) as { message?: string; errors?: Array<{ message?: string }> };
            const details = parsed.errors?.map((entry) => entry.message).filter(Boolean);
            if (details?.length) return `GitHub webhook API failed (${status}): ${details.join('; ')}`;
            if (parsed.message) return `GitHub webhook API failed (${status}): ${parsed.message}`;
        } catch {
            // GitHub sometimes returns plain text.
        }
        if (body.trim()) return `GitHub webhook API failed (${status}): ${body.trim().slice(0, 240)}`;
        return `GitHub webhook API failed (${status})`;
    }
}
