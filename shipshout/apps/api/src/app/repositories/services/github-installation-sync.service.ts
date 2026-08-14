import { Injectable, Logger } from '@nestjs/common';
import { In } from 'typeorm';
import {
    createGithubAppJwt,
    fetchAppInstallations,
    fetchInstallationAccessToken,
    fetchInstallationReposWithToken,
} from '@shipshout/integrations-github';
import { SourceProvider, WebhookStatus } from '@shipshout/database';
import { ConnectedRepoRepository } from '../repositories/connected-repo.repository';

type InstallationPayload = {
    action: string;
    installation?: { id: number };
    repositories_removed?: { id: number }[];
};

@Injectable()
export class GithubInstallationSyncService {
    private readonly log = new Logger(GithubInstallationSyncService.name);

    constructor(private repos: ConnectedRepoRepository) {}

    usesGithubApp() {
        return !!(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY);
    }

    async handleInstallation(payload: InstallationPayload) {
        const installationId = payload.installation?.id;
        if (!installationId) return { accepted: false };
        if (payload.action === 'deleted' || payload.action === 'suspend') {
            await this.markInstallationDisconnected(String(installationId));
            return { accepted: true };
        }
        return { accepted: true, ignored: true };
    }

    async handleInstallationRepositories(payload: InstallationPayload) {
        if (payload.action !== 'removed') return { accepted: true, ignored: true };
        const externalIds = (payload.repositories_removed ?? []).map((r) => String(r.id));
        if (externalIds.length === 0) return { accepted: true };
        await this.markReposDisconnected(externalIds);
        return { accepted: true };
    }

    async reconcileWorkspace(workspaceId: string) {
        if (!this.usesGithubApp()) return;
        const githubRepos = await this.repos.find({
            where: { workspace: { id: workspaceId }, provider: SourceProvider.Github },
        });
        const trackable = githubRepos.filter(
            (r) => r.webhookStatus === WebhookStatus.Active || r.webhookStatus === WebhookStatus.Pending,
        );
        if (trackable.length === 0) return;

        const jwt = createGithubAppJwt(process.env.GITHUB_APP_ID!, process.env.GITHUB_APP_PRIVATE_KEY!);
        const installed = await this.fetchInstalledRepoMap(jwt);
        for (const repo of trackable) {
            const installationId = installed.get(repo.externalId);
            if (installationId) {
                if (!repo.githubInstallationId)
                    await this.repos.update(repo.id, { githubInstallationId: installationId });
                continue;
            }
            if (repo.webhookStatus === WebhookStatus.Disconnected) continue;
            await this.repos.update(repo.id, { webhookStatus: WebhookStatus.Disconnected });
            this.log.log(`Marked ${repo.externalId} disconnected — not in any GitHub App installation`);
        }
    }

    private async fetchInstalledRepoMap(appJwt: string) {
        const map = new Map<string, string>();
        const installations = await fetchAppInstallations(appJwt);
        for (const installation of installations) {
            try {
                const token = await fetchInstallationAccessToken(String(installation.id), appJwt);
                const repos = await fetchInstallationReposWithToken(token);
                for (const r of repos) map.set(String(r.id), String(installation.id));
            } catch (err) {
                this.log.warn(`Skipping installation ${installation.id}: ${err instanceof Error ? err.message : err}`);
            }
        }
        return map;
    }

    private async markInstallationDisconnected(installationId: string) {
        await this.repos.update(
            { provider: SourceProvider.Github, githubInstallationId: installationId },
            { webhookStatus: WebhookStatus.Disconnected },
        );
    }

    private async markReposDisconnected(externalIds: string[]) {
        await this.repos.update(
            { provider: SourceProvider.Github, externalId: In(externalIds) },
            { webhookStatus: WebhookStatus.Disconnected },
        );
    }
}
