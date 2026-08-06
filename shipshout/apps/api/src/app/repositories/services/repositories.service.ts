import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { encryptSecret, decryptSecret } from '@shipshout/shared-util';
import { RegisterRepoDto } from '../dtos/register-repo.dto';
import { TierService } from '../../billing/services/tier.service';
import { ConnectedRepoRepository } from '../repositories/connected-repo.repository';
import { ReleaseEventRepository } from '../../webhooks/repositories/release-event.repository';

@Injectable()
export class RepositoriesService {
    constructor(
        private repos: ConnectedRepoRepository,
        private tiers: TierService,
        private events: ReleaseEventRepository,
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

    async createFromGithub(workspaceId: string, repo: { id: number; full_name: string }) {
        const externalId = String(repo.id);
        const existing = await this.repos.findByExternalIdForWorkspace(workspaceId, 'github' as any, externalId);
        if (existing) return { repository: existing, webhookSecret: null as string | null, created: false };
        await this.tiers.assertCanAddRepo(workspaceId);
        const webhookSecret = randomBytes(32).toString('hex');
        const repository = await this.repos.save(
            this.repos.create({
                workspace: { id: workspaceId },
                provider: 'github' as any,
                externalId,
                name: repo.full_name,
                webhookSecret: encryptSecret(webhookSecret),
            }),
        );
        return { repository, webhookSecret, created: true };
    }

    async list(workspaceId: string) {
        const repos = await this.repos.listForWorkspace(workspaceId);
        const latest = await this.events.findLatestByRepositoryIds(repos.map((r) => r.id));
        return repos.map((r) => {
            const ev = latest.get(r.id);
            return {
                id: r.id,
                provider: r.provider,
                name: r.name,
                enabled: r.enabled,
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
