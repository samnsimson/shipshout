import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailClient } from '@shipshout/email-client';
import { AiGenerationService } from '../../ai/services/ai-generation.service';
import { RepositoryChannelRepository } from '../../channels/repositories/repository-channel.repository';
import { ChannelEntitlementUtils } from '../../channels/utils/channel-entitlement.utils';
import { ShoutoutChannelDraftRepository } from '../repositories/shoutout-channel-draft.repository';
import { ShoutoutRepository } from '../repositories/shoutout.repository';
import { ShoutoutLimitService } from './shoutout-limit.service';
import { ShoutoutEventsService } from './shoutout-events.service';
import { UserEmailLookup } from './user-email-lookup.service';

@Injectable()
export class ShoutoutGenerationService {
    private readonly clientAppUrl: string;

    constructor(
        private readonly shoutouts: ShoutoutRepository,
        private readonly repositoryChannels: RepositoryChannelRepository,
        private readonly shoutoutLimits: ShoutoutLimitService,
        private readonly drafts: ShoutoutChannelDraftRepository,
        private readonly ai: AiGenerationService,
        private readonly emailClient: EmailClient,
        private readonly userEmailLookup: UserEmailLookup,
        private readonly events: ShoutoutEventsService,
        config: ConfigService,
    ) {
        this.clientAppUrl = config.getOrThrow<string>('CLIENT_APP_URL').replace(/\/$/, '');
    }

    async run(shoutoutId: string): Promise<void> {
        const shoutout = await this.shoutouts.findById(shoutoutId);
        if (!shoutout) return;
        if (shoutout.status !== 'generating' && shoutout.status !== 'generation_failed') return;

        const [channelRows, limits] = await Promise.all([
            this.repositoryChannels.findByLinkedRepositoryId(shoutout.linkedRepositoryId),
            this.shoutoutLimits.getLimitsForUser(shoutout.userId),
        ]);
        const planChannels = limits.channels ?? [];
        const entitled = ChannelEntitlementUtils.filterEntitled(channelRows, planChannels);
        const generatable = ChannelEntitlementUtils.filterGeneratable(channelRows, planChannels);

        if (generatable.length === 0) {
            await this.shoutouts.save({ ...shoutout, status: 'generation_failed' });
            await this.events.publish(shoutoutId, { status: 'generation_failed' });
            return;
        }

        const variants = await this.ai.generateVariants({
            sourceSummary: shoutout.sourceSummary,
            channels: generatable.map((row) => ({ key: row.channelKey, tone: row.tone })),
            repoFullName: shoutout.linkedRepository?.fullName ?? 'Unknown repository',
        });

        for (const [channelKey, variant] of Object.entries(variants))
            await this.drafts.upsertDraft({ shoutoutId, channelKey, title: variant.title, body: variant.body });

        const emailAlertEnabled = entitled.some((row) => row.channelKey === 'email_alert');
        if (emailAlertEnabled) await this.sendDraftReadyAlert(shoutout.userId, shoutoutId, shoutout.title);

        await this.shoutouts.save({ ...shoutout, status: 'ready_for_review' });
        await this.events.publish(shoutoutId, { status: 'ready_for_review' });
    }

    async regenerateChannel(shoutoutId: string, channelKey: string): Promise<void> {
        const shoutout = await this.shoutouts.findById(shoutoutId);
        if (!shoutout) throw new NotFoundException('Shoutout not found');
        if (channelKey === 'email_alert') throw new ConflictException('Channel cannot be regenerated');

        const [channelRows, limits] = await Promise.all([
            this.repositoryChannels.findByLinkedRepositoryId(shoutout.linkedRepositoryId),
            this.shoutoutLimits.getLimitsForUser(shoutout.userId),
        ]);
        const planChannels = limits.channels ?? [];
        const channel = ChannelEntitlementUtils.filterGeneratable(channelRows, planChannels).find((row) => row.channelKey === channelKey);
        if (!channel) throw new ConflictException('Channel is not enabled or entitled for generation');

        const variants = await this.ai.generateVariants({
            sourceSummary: shoutout.sourceSummary,
            channels: [{ key: channel.channelKey, tone: channel.tone }],
            repoFullName: shoutout.linkedRepository?.fullName ?? 'Unknown repository',
        });
        const variant = variants[channelKey];
        if (!variant) throw new ConflictException('Failed to generate draft for channel');

        await this.drafts.upsertDraft({ shoutoutId, channelKey, title: variant.title, body: variant.body });
    }

    private async sendDraftReadyAlert(userId: string, shoutoutId: string, title: string): Promise<void> {
        const email = await this.userEmailLookup.findByUserId(userId);
        if (!email) return;

        const link = `${this.clientAppUrl}/dashboard/shoutouts/${shoutoutId}`;
        await this.emailClient.send({
            to: email,
            subject: `Draft ready: ${title}`,
            text: `Your shoutout draft is ready: ${link}`,
            html: `<p>Your shoutout draft is ready.</p><p><a href="${link}">${link}</a></p>`,
        });
    }
}
