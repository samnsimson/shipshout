import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { SourceProvider } from '@shipshout/database';
import { verifyGithubSignature, normalizeGithubRelease } from '@shipshout/integrations-github';
import { verifyLinearSignature, normalizeLinear } from '@shipshout/integrations-linear';
import { verifyJiraSecret, normalizeJira } from '@shipshout/integrations-jira';
import { QUEUES, GenerateJob } from '@shipshout/queue';
import { TierService } from '../../billing/services/tier.service';
import { RepositoriesService } from '../../repositories/services/repositories.service';
import { GithubInstallationSyncService } from '../../repositories/services/github-installation-sync.service';
import { ReleaseEventRepository } from '../repositories/release-event.repository';

@Injectable()
export class WebhooksService {
    constructor(
        private repos: RepositoriesService,
        private events: ReleaseEventRepository,
        private tiers: TierService,
        private installationSync: GithubInstallationSyncService,
        @InjectQueue(QUEUES.generate) private generateQueue: Queue,
    ) {}

    async ingestNormalized(input: {
        source: SourceProvider;
        externalId: string;
        commitSummary: string;
        deliveryId: string;
        verified: boolean;
        requireSourceIntegration: boolean;
        rawPayload?: unknown;
    }): Promise<{ accepted: boolean; duplicate?: boolean }> {
        if (!input.verified) return { accepted: false };
        const repo = await this.repos.findByExternalId(input.source, input.externalId);
        if (!repo || !repo.enabled) return { accepted: false };
        return this.acceptEvent(repo, {
            source: input.source,
            deliveryId: input.deliveryId,
            commitSummary: input.commitSummary,
            requireSourceIntegration: input.requireSourceIntegration,
            rawPayload: input.rawPayload ?? { externalId: input.externalId },
        });
    }

    private async acceptEvent(
        repo: { id: string; workspace: { id: string } },
        input: { source: SourceProvider; deliveryId: string; commitSummary: string; requireSourceIntegration: boolean; rawPayload: unknown },
    ): Promise<{ accepted: boolean; duplicate?: boolean }> {
        const workspaceId = repo.workspace.id;
        if (input.requireSourceIntegration && !(await this.tiers.sourceIntegrationsAllowed(workspaceId))) return { accepted: false };

        const existing = await this.events.findByDeliveryId(repo.id, input.deliveryId);
        if (existing) return { accepted: true, duplicate: true };
        if (!(await this.tiers.tryConsumeRelease(workspaceId))) return { accepted: false };

        const saved = await this.events.save(
            this.events.create({
                repository: repo as any,
                source: input.source,
                deliveryId: input.deliveryId,
                rawPayload: input.rawPayload,
                commitSummary: input.commitSummary,
            }),
        );
        const job: GenerateJob = { releaseEventId: saved.id };
        await this.generateQueue.add('generate', job);
        return { accepted: true, duplicate: false };
    }

    async handleGithub(rawBody: Buffer, headers: Record<string, string | undefined>) {
        const event = headers['x-github-event'];
        const payload = JSON.parse(rawBody.toString('utf8'));

        if (event === 'installation' || event === 'installation_repositories') {
            const appSecret = process.env.GITHUB_APP_WEBHOOK_SECRET;
            const signature = headers['x-hub-signature-256'] ?? '';
            if (!appSecret || !verifyGithubSignature(rawBody, signature, appSecret)) return { accepted: false };
            if (event === 'installation') return this.installationSync.handleInstallation(payload);
            return this.installationSync.handleInstallationRepositories(payload);
        }

        if (event && event !== 'release') return { accepted: false };
        const norm = normalizeGithubRelease(payload);
        const repo = await this.repos.findByExternalId('github', norm.externalId);
        if (!repo || !repo.enabled) return { accepted: false };

        const signature = headers['x-hub-signature-256'] ?? '';
        const appSecret = process.env.GITHUB_APP_WEBHOOK_SECRET;
        const verified =
            (appSecret ? verifyGithubSignature(rawBody, signature, appSecret) : false) ||
            verifyGithubSignature(rawBody, signature, this.repos.decryptSecret(repo.webhookSecret));
        return this.ingestNormalized({
            source: SourceProvider.Github,
            externalId: norm.externalId,
            commitSummary: norm.commitSummary,
            deliveryId: headers['x-github-delivery'] ?? '',
            verified,
            requireSourceIntegration: false,
            rawPayload: payload,
        });
    }

    async handleLinear(rawBody: Buffer, headers: Record<string, string | undefined>) {
        const payload = JSON.parse(rawBody.toString('utf8'));
        const norm = normalizeLinear(payload);
        if (!norm.isCompletion) return { accepted: false };
        const repo = await this.repos.findByExternalId(SourceProvider.Linear, norm.externalId);
        const verified = !!repo && verifyLinearSignature(rawBody, headers['linear-signature'] ?? '', this.repos.decryptSecret(repo.webhookSecret));
        return this.ingestNormalized({
            source: SourceProvider.Linear,
            externalId: norm.externalId,
            commitSummary: norm.commitSummary,
            deliveryId: headers['linear-delivery'] ?? norm.externalId,
            verified,
            requireSourceIntegration: true,
            rawPayload: payload,
        });
    }

    async handleJira(rawBody: Buffer, _headers: Record<string, string | undefined>, query: Record<string, string | undefined>) {
        const payload = JSON.parse(rawBody.toString('utf8'));
        const norm = normalizeJira(payload);
        if (!norm.isCompletion) return { accepted: false };
        const repo = await this.repos.findByExternalId(SourceProvider.Jira, norm.externalId);
        const verified = !!repo && verifyJiraSecret(query['secret'] ?? '', this.repos.decryptSecret(repo.webhookSecret));
        return this.ingestNormalized({
            source: SourceProvider.Jira,
            externalId: norm.externalId,
            commitSummary: norm.commitSummary,
            deliveryId: `${norm.externalId}:${payload?.timestamp ?? Date.now()}`,
            verified,
            requireSourceIntegration: true,
            rawPayload: payload,
        });
    }
}
