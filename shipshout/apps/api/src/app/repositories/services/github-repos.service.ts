import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { WebhookStatus } from '@shipshout/database';
import { encryptSecret, decryptSecret } from '@shipshout/shared-util';
import {
    createGithubAppJwt,
    exchangeGithubCode,
    fetchGithubRepos,
    fetchInstallationAccessToken,
    fetchInstallationRepos,
    registerGithubWebhook,
    GithubRepoSummary,
} from '@shipshout/integrations-github';
import { RepositoriesService } from './repositories.service';

export type PendingGithubConnect = {
    workspaceId: string;
    accessToken?: string;
    installationId?: string;
    repos: { id: number; full_name: string }[];
};

export type GithubConnectPrepareResult = {
    pending: PendingGithubConnect;
    skipped: number;
    total: number;
};

@Injectable()
export class GithubReposService {
    private readonly log = new Logger(GithubReposService.name);

    constructor(private repos: RepositoriesService) {}

    usesGithubApp() {
        return !!(process.env.GITHUB_APP_SLUG && process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY);
    }

    startUrl(workspaceId: string) {
        if (this.usesGithubApp())
            return `https://github.com/apps/${process.env.GITHUB_APP_SLUG}/installations/new?${new URLSearchParams({ state: workspaceId })}`;
        const params = new URLSearchParams({
            client_id: process.env.GITHUB_CLIENT_ID!,
            redirect_uri: this.oauthRedirectUri(),
            scope: 'read:user repo',
            state: this.repoOAuthState(workspaceId),
        });
        return `https://github.com/login/oauth/authorize?${params}`;
    }

    oauthRedirectUri() {
        return process.env.GITHUB_CALLBACK_URL ?? `${process.env.API_BASE_URL}/api/auth/github/callback`;
    }

    repoOAuthState(workspaceId: string) {
        return `repo:${workspaceId}`;
    }

    parseRepoOAuthState(state: string | undefined) {
        if (!state?.startsWith('repo:')) return null;
        return state.slice('repo:'.length);
    }

    webhookUrl() {
        return `${process.env.API_BASE_URL}/api/webhooks/github`;
    }

    async prepareOAuthSelection(workspaceId: string, code: string): Promise<GithubConnectPrepareResult> {
        const accessToken = await exchangeGithubCode(code, this.oauthRedirectUri());
        const allRepos = await fetchGithubRepos(accessToken);
        const githubRepos = await this.filterNewRepos(workspaceId, allRepos);
        const repos = githubRepos.map((r) => ({ id: r.id, full_name: r.full_name }));
        return {
            pending: { workspaceId, accessToken: encryptSecret(accessToken), repos },
            skipped: allRepos.length - githubRepos.length,
            total: allRepos.length,
        };
    }

    async prepareInstallationSelection(workspaceId: string, installationId: string): Promise<GithubConnectPrepareResult> {
        const jwt = createGithubAppJwt(process.env.GITHUB_APP_ID!, process.env.GITHUB_APP_PRIVATE_KEY!);
        const allRepos = await fetchInstallationRepos(installationId, jwt);
        const githubRepos = await this.filterNewRepos(workspaceId, allRepos);
        const repos = githubRepos.map((r) => ({ id: r.id, full_name: r.full_name }));
        return {
            pending: { workspaceId, installationId, repos },
            skipped: allRepos.length - githubRepos.length,
            total: allRepos.length,
        };
    }

    pendingFromSession(workspaceId: string, session?: PendingGithubConnect) {
        if (!session || session.workspaceId !== workspaceId) throw new NotFoundException('No pending GitHub connection');
        return { repos: session.repos };
    }

    async importSelected(workspaceId: string, session: PendingGithubConnect, repoIds: number[]) {
        if (session.workspaceId !== workspaceId) throw new NotFoundException('No pending GitHub connection');
        if (repoIds.length === 0) throw new BadRequestException('Select at least one repository');
        const selected = session.repos.filter((r) => repoIds.includes(r.id));
        if (selected.length === 0) throw new BadRequestException('Selected repositories are not available');
        const accessToken = await this.connectToken(session);
        return this.importRepos(workspaceId, selected, accessToken, !!session.installationId);
    }

    private async connectToken(session: PendingGithubConnect) {
        if (session.installationId) {
            const jwt = createGithubAppJwt(process.env.GITHUB_APP_ID!, process.env.GITHUB_APP_PRIVATE_KEY!);
            return fetchInstallationAccessToken(session.installationId, jwt);
        }
        if (!session.accessToken) throw new BadRequestException('No pending GitHub connection');
        return decryptSecret(session.accessToken);
    }

    private async filterNewRepos(workspaceId: string, githubRepos: GithubRepoSummary[]) {
        const connected = new Set(await this.repos.listGithubExternalIds(workspaceId));
        return githubRepos.filter((r) => !connected.has(String(r.id)));
    }

    private async importRepos(
        workspaceId: string,
        githubRepos: { id: number; full_name: string }[],
        accessToken: string,
        viaApp: boolean,
    ) {
        let imported = 0;
        let skipped = 0;
        let failed = 0;
        for (const repo of githubRepos) {
            try {
                const { repository, webhookSecret, created } = await this.repos.createFromGithub(
                    workspaceId,
                    repo,
                    viaApp ? { webhookStatus: WebhookStatus.Active } : undefined,
                );
                if (!created) {
                    skipped++;
                    continue;
                }
                imported++;
                if (viaApp) continue;
                if (!webhookSecret) continue;
                try {
                    await registerGithubWebhook(repo.full_name, accessToken, this.webhookUrl(), webhookSecret);
                    await this.repos.setWebhookStatus(repository.id, WebhookStatus.Active);
                } catch (err) {
                    await this.repos.setWebhookStatus(repository.id, WebhookStatus.Failed);
                    this.log.warn(`Webhook registration failed for ${repo.full_name}: ${err instanceof Error ? err.message : err}`);
                }
            } catch (err) {
                failed++;
                this.log.warn(`Skipped ${repo.full_name}: ${err instanceof Error ? err.message : err}`);
            }
        }
        return { imported, skipped, failed, total: githubRepos.length };
    }
}
