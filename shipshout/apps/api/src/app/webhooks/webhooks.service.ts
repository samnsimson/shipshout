import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { SourceProvider, ReleaseEventStatus } from '@shipshout/database';
import { verifyGithubSignature, normalizeGithubRelease } from '@shipshout/integrations-github';
import { QUEUES, GenerateJob } from '@shipshout/queue';
import { TierService } from '../billing/tier.service';
import { RepositoriesService } from '../repositories/repositories.service';
import { ReleaseEventRepository } from './release-event.repository';

@Injectable()
export class WebhooksService {
    constructor(
        private repos: RepositoriesService,
        private events: ReleaseEventRepository,
        private tiers: TierService,
        @InjectQueue(QUEUES.generate) private generateQueue: Queue,
    ) {}

    async handleGithub(rawBody: Buffer, headers: Record<string, string | undefined>) {
        const payload = JSON.parse(rawBody.toString('utf8'));
        const norm = normalizeGithubRelease(payload);
        const repo = await this.repos.findByExternalId('github', norm.externalId);
        if (!repo || !repo.enabled) return { accepted: false };

        const secret = this.repos.decryptSecret(repo.webhookSecret);
        if (!verifyGithubSignature(rawBody, headers['x-hub-signature-256'] ?? '', secret)) return { accepted: false };

        const deliveryId = headers['x-github-delivery'] ?? '';
        const existing = await this.events.findByDeliveryId(repo.id, deliveryId);
        if (existing) return { accepted: true, duplicate: true };

        const workspaceId = repo.workspace.id;
        const allowed = await this.tiers.tryConsumeRelease(workspaceId);
        if (!allowed) {
            await this.events.save(
                this.events.create({
                    repository: repo,
                    source: SourceProvider.Github,
                    deliveryId,
                    rawPayload: payload,
                    commitSummary: 'over-limit',
                    status: ReleaseEventStatus.Failed,
                }),
            );
            return { accepted: false, overLimit: true };
        }

        const saved = await this.events.save(
            this.events.create({
                repository: repo,
                source: SourceProvider.Github,
                deliveryId,
                rawPayload: payload,
                commitSummary: norm.commitSummary,
            }),
        );
        const job: GenerateJob = { releaseEventId: saved.id };
        await this.generateQueue.add('generate', job);
        return { accepted: true, duplicate: false };
    }
}
