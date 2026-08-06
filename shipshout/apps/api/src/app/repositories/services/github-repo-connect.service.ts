import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { GithubPermissionsRequiredError, GithubReposService, PendingGithubConnect } from './github-repos.service';
import { emptySelectionQuery, repoPickerUrl, reposSettingsUrl } from '../utils/github-repo-connect-urls';

@Injectable()
export class GithubRepoConnectService {
    private readonly log = new Logger(GithubRepoConnectService.name);

    constructor(private githubRepos: GithubReposService) {}

    async completeOAuthConnect(req: Request, workspaceId: string, code: string | undefined): Promise<string> {
        if (!code) return reposSettingsUrl(workspaceId, { error: 'connect_failed' });
        try {
            const prepared = await this.githubRepos.prepareOAuthSelection(workspaceId, code);
            return this.finishPrepare(req, workspaceId, prepared);
        } catch (err) {
            this.log.error(`GitHub repo connect failed: ${err instanceof Error ? err.message : err}`);
            return reposSettingsUrl(workspaceId, { error: 'connect_failed' });
        }
    }

    async completeInstallConnect(req: Request, workspaceId: string, installationId: string): Promise<string> {
        try {
            const prepared = await this.githubRepos.prepareInstallationSelection(workspaceId, installationId);
            if (prepared.pending.repos.length === 0)
                return reposSettingsUrl(workspaceId, emptySelectionQuery(prepared.skipped, prepared.total));
            const repoIds = prepared.pending.repos.map((r) => r.id);
            const result = await this.githubRepos.importSelected(workspaceId, prepared.pending, repoIds);
            return reposSettingsUrl(workspaceId, {
                connected: result.imported,
                skipped: result.skipped + prepared.skipped,
                ...(result.failed > 0 ? { error: 'connect_partial' } : {}),
            });
        } catch (err) {
            if (err instanceof GithubPermissionsRequiredError) throw err;
            this.log.error(`GitHub App install failed: ${err instanceof Error ? err.message : err}`);
            return reposSettingsUrl(workspaceId, { error: 'connect_failed' });
        }
    }

    private async finishPrepare(
        req: Request,
        workspaceId: string,
        prepared: { pending: PendingGithubConnect; skipped: number; total: number },
    ): Promise<string> {
        if (prepared.pending.repos.length === 0)
            return reposSettingsUrl(workspaceId, emptySelectionQuery(prepared.skipped, prepared.total));
        try {
            await this.savePendingConnect(req, prepared.pending);
            return repoPickerUrl(workspaceId);
        } catch (err) {
            this.log.error(`Session save failed: ${err instanceof Error ? err.message : err}`);
            return reposSettingsUrl(workspaceId, { error: 'connect_failed' });
        }
    }

    private savePendingConnect(req: Request, pending: PendingGithubConnect): Promise<void> {
        req.session.githubRepoConnect = pending;
        return new Promise((resolve, reject) => {
            req.session.save((err) => (err ? reject(err) : resolve()));
        });
    }
}

export { GithubPermissionsRequiredError };
