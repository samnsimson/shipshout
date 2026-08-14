import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { WebhookStatus } from '@shipshout/database';
import { encryptSecret, decryptSecret } from '@shipshout/shared-util';
import { RegisterRepoDto } from '../dtos/register-repo.dto';
import { TierService } from '../../billing/services/tier.service';
import { ConnectedRepoRepository } from '../repositories/connected-repo.repository';
import { ReleaseEventRepository } from '../../webhooks/repositories/release-event.repository';
import { GithubInstallationSyncService } from './github-installation-sync.service';

@Injectable()
export class RepositoriesService {
    constructor(
        private repos: ConnectedRepoRepository,
        private tiers: TierService,
        private events: ReleaseEventRepository,
        private installationSync: GithubInstallationSyncService,
    ) {}

    async create(workspaceId: string, dto: RegisterRepoDto) {
        await this.tiers.assertCanAddRepo(workspaceId);
        const webhookSecret = randomBytes(32).toString('hex');
        const repository = await this.repos.save(
            this.repos.create({
                workspace: { id: workspaceId },
                provider: dto.provider,
                externalId: dto.externalId,
                name: dto.name,
                webhookSecret: encryptSecret(webhookSecret),
            }),
        );
        return { repository, webhookSecret };
    }

    async createFromGithub(
        workspaceId: string,
        repo: { id: number; full_name: string },
        opts?: { webhookStatus?: WebhookStatus; githubInstallationId?: string },
    ) {
        const externalId = String(repo.id);
        const existing = await this.repos.findByExternalIdForWorkspace(workspaceId, 'github' as any, externalId);
        if (existing) {
            if (opts?.githubInstallationId || opts?.webhookStatus) {
                await this.repos.update(existing.id, {
                    ...(opts.githubInstallationId && { githubInstallationId: opts.githubInstallationId }),
                    ...(opts.webhookStatus && { webhookStatus: opts.webhookStatus }),
                });
                Object.assign(existing, opts);
            }
            return { repository: existing, webhookSecret: null as string | null, created: false };
        }
        await this.tiers.assertCanAddRepo(workspaceId);
        const webhookSecret = randomBytes(32).toString('hex');
        const repository = await this.repos.save(
            this.repos.create({
                workspace: { id: workspaceId },
                provider: 'github' as any,
                externalId,
                name: repo.full_name,
                webhookSecret: encryptSecret(webhookSecret),
                webhookStatus: opts?.webhookStatus ?? WebhookStatus.Pending,
                githubInstallationId: opts?.githubInstallationId,
            }),
        );
        return { repository, webhookSecret, created: true };
    }

    async setGithubConnection(repositoryId: string, githubInstallationId: string, webhookStatus: WebhookStatus) {
        await this.repos.update(repositoryId, { githubInstallationId, webhookStatus });
    }

    async setWebhookStatus(repositoryId: string, webhookStatus: WebhookStatus) {
        await this.repos.update(repositoryId, { webhookStatus });
    }

    async listGithubExternalIds(workspaceId: string) {
        const repos = await this.repos.listForWorkspace(workspaceId);
        return repos.filter((r) => r.provider === 'github').map((r) => r.externalId);
    }

    /** Repos with webhooks successfully configured — used to filter the connect picker. */
    async listActiveGithubExternalIds(workspaceId: string) {
        const repos = await this.repos.listForWorkspace(workspaceId);
        return repos
            .filter((r) => r.provider === 'github' && r.webhookStatus === WebhookStatus.Active)
            .map((r) => r.externalId);
    }

    async list(workspaceId: string) {
        await this.installationSync.reconcileWorkspace(workspaceId);
        const repos = await this.repos.listForWorkspace(workspaceId);
        const latest = await this.events.findLatestByRepositoryIds(repos.map((r) => r.id));
        return repos.map((r) => {
            const ev = latest.get(r.id);
            return {
                id: r.id,
                provider: r.provider,
                name: r.name,
                enabled: r.enabled,
                webhookStatus: r.webhookStatus,
                lastReleaseAt: ev ? ev.createdAt.toISOString() : null,
                lastReleaseStatus: ev ? ev.status : null,
            };
        });
    }

    findByExternalId(provider: string, externalId: string) {
        return this.repos.findByExternalId(provider as any, externalId);
    }

    findById(id: string) {
        return this.repos.findOneBy({ id });
    }

    decryptSecret(cipher: string) {
        return decryptSecret(cipher);
    }
}
