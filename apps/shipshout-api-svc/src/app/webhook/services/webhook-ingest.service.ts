import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { TriggerEventStatus } from '@shipshout/database';
import { ShoutoutRepository } from '../../shoutout/repositories/shoutout.repository';
import { ShoutoutLimitService } from '../../shoutout/services/shoutout-limit.service';
import { ShoutoutLimitUtils } from '../../shoutout/utils/shoutout-limit.utils';
import { ShoutoutTitleUtils } from '../../shoutout/utils/shoutout-title.utils';
import { TriggerEventRepository } from '../../trigger/repositories/trigger-event.repository';
import { RepositoryTriggerRepository } from '../../trigger/repositories/repository-trigger.repository';
import { RepositoryWebhookRepository } from '../../trigger/repositories/repository-webhook.repository';
import { TriggerService } from '../../trigger/services/trigger.service';
import { TriggerEventUtils } from '../../trigger/utils/trigger-event.utils';
import { WebhookSecretUtils } from '../../trigger/utils/webhook-secret.utils';

@Injectable()
export class WebhookIngestService {
    constructor(
        private readonly repositoryWebhooks: RepositoryWebhookRepository,
        private readonly repositoryTriggers: RepositoryTriggerRepository,
        private readonly triggerEvents: TriggerEventRepository,
        private readonly shoutouts: ShoutoutRepository,
        private readonly shoutoutLimits: ShoutoutLimitService,
        private readonly triggerService: TriggerService,
    ) {}

    async ingest(params: {
        deliveryToken: string;
        githubEvent: string;
        githubDeliveryId: string;
        rawBody: Buffer;
        signatureHeader?: string;
    }): Promise<void> {
        const webhook = await this.repositoryWebhooks.findByDeliveryToken(params.deliveryToken);
        if (!webhook?.linkedRepository) throw new NotFoundException('Webhook not found');

        const secret = this.triggerService.decryptWebhookSecret(webhook);
        if (!WebhookSecretUtils.verifySignature(params.rawBody, secret, params.signatureHeader)) throw new UnauthorizedException('Invalid webhook signature');

        const existing = await this.triggerEvents.findByGithubDeliveryId(params.githubDeliveryId);
        if (existing) return;

        const payload = JSON.parse(params.rawBody.toString('utf8')) as Record<string, unknown>;
        const repo = webhook.linkedRepository;
        const triggers = await this.repositoryTriggers.ensureForLinkedRepository(repo.id);
        const triggerType = TriggerEventUtils.resolveTriggerType({ githubEvent: params.githubEvent, payload, defaultBranch: repo.defaultBranch });

        if (!triggerType || !TriggerEventUtils.matchesEnabledTrigger(triggerType, triggers)) {
            await this.triggerEvents.save({
                linkedRepositoryId: repo.id,
                userId: repo.userId,
                githubDeliveryId: params.githubDeliveryId,
                eventType: params.githubEvent,
                triggerType: triggerType ?? 'release',
                summary: triggerType ? TriggerEventUtils.buildSummary(triggerType, payload, repo.fullName) : `Ignored ${params.githubEvent} on ${repo.fullName}`,
                payload,
                status: 'ignored' satisfies TriggerEventStatus,
                shoutoutId: null,
            });
            await this.repositoryWebhooks.save({ ...webhook, lastDeliveryAt: new Date() });
            return;
        }

        const limits = await this.shoutoutLimits.getLimitsForUser(repo.userId);
        const monthCount = await this.shoutouts.countForUserSince(repo.userId, ShoutoutLimitUtils.monthStart());
        const withinLimit = ShoutoutLimitUtils.isWithinMonthlyLimit(monthCount, limits);

        const event = await this.triggerEvents.save({
            linkedRepositoryId: repo.id,
            userId: repo.userId,
            githubDeliveryId: params.githubDeliveryId,
            eventType: params.githubEvent,
            triggerType,
            summary: TriggerEventUtils.buildSummary(triggerType, payload, repo.fullName),
            payload,
            status: withinLimit ? 'processed' : 'limit_exceeded',
            shoutoutId: null,
        });

        if (withinLimit) {
            const shoutout = await this.shoutouts.save({
                userId: repo.userId,
                linkedRepositoryId: repo.id,
                triggerEventId: event.id,
                title: ShoutoutTitleUtils.deriveTitle(triggerType, payload, repo.fullName),
                status: 'pending_ai',
                sourceSummary: ShoutoutTitleUtils.buildSourceSummary(triggerType, payload),
            });
            await this.triggerEvents.save({ ...event, shoutoutId: shoutout.id });
        }

        await this.repositoryWebhooks.save({ ...webhook, lastDeliveryAt: new Date() });
    }
}
