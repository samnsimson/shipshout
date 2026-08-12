import { Injectable } from '@nestjs/common';
import { ChannelTypeEntity, ShoutoutDispatchStatus, ShoutoutStatus } from '@shipshout/database';
import { EmailClient } from '@shipshout/email-client';
import { ChannelTypeRepository } from '../../channels/repositories/channel-type.repository';
import { RepositoryChannelRepository } from '../../channels/repositories/repository-channel.repository';
import { ChannelEntitlementUtils } from '../../channels/utils/channel-entitlement.utils';
import { ShoutoutChannelDraftRepository } from '../repositories/shoutout-channel-draft.repository';
import { ShoutoutDispatchLogRepository } from '../repositories/shoutout-dispatch-log.repository';
import { ShoutoutRepository } from '../repositories/shoutout.repository';
import { ShoutoutEventsService } from './shoutout-events.service';
import { ShoutoutLimitService } from './shoutout-limit.service';

@Injectable()
export class ShoutoutDispatchService {
    constructor(
        private readonly shoutouts: ShoutoutRepository,
        private readonly channelTypes: ChannelTypeRepository,
        private readonly repositoryChannels: RepositoryChannelRepository,
        private readonly shoutoutLimits: ShoutoutLimitService,
        private readonly drafts: ShoutoutChannelDraftRepository,
        private readonly dispatchLogs: ShoutoutDispatchLogRepository,
        private readonly emailClient: EmailClient,
        private readonly events: ShoutoutEventsService,
    ) {}

    async run(shoutoutId: string): Promise<void> {
        const shoutout = await this.shoutouts.findById(shoutoutId);
        if (!shoutout) return;
        if (shoutout.status !== 'publishing') return;

        const [publishTypes, channelRows, limits, draftRows] = await Promise.all([
            this.channelTypes.findAllActive(),
            this.repositoryChannels.findByLinkedRepositoryId(shoutout.linkedRepositoryId),
            this.shoutoutLimits.getLimitsForUser(shoutout.userId),
            this.drafts.findByShoutoutId(shoutoutId),
        ]);
        const planChannels = limits.channels ?? [];
        const rowByKey = new Map(channelRows.map((row) => [row.channelKey, row]));
        const draftByKey = new Map(draftRows.map((row) => [row.channelKey, row]));
        const publishChannelTypes = publishTypes.filter((type) => type.kind === 'publish');
        const results: ShoutoutDispatchStatus[] = [];

        for (const channelType of publishChannelTypes) {
            const row = rowByKey.get(channelType.key);
            const result = await this.dispatchChannel(channelType, row, planChannels, draftByKey);
            results.push(result.status);
            await this.dispatchLogs.createLog({
                shoutoutId,
                channelKey: channelType.key,
                status: result.status,
                error: result.error ?? null,
                sentAt: result.sentAt ?? null,
            });
        }

        const finalStatus = ShoutoutDispatchService.computeFinalStatus(results);
        await this.shoutouts.save({ ...shoutout, status: finalStatus });
        await this.events.publish(shoutoutId, { status: finalStatus });
    }

    private async dispatchChannel(
        channelType: ChannelTypeEntity,
        row: { enabled: boolean; config: Record<string, unknown> } | undefined,
        planChannels: string[],
        draftByKey: Map<string, { title: string; body: string }>,
    ): Promise<{ status: ShoutoutDispatchStatus; error?: string; sentAt?: Date }> {
        if (!row || !row.enabled) return { status: 'skipped', error: 'Channel disabled' };
        if (!ChannelEntitlementUtils.canEnable(channelType.key, planChannels))
            return { status: 'skipped', error: 'Channel not available on plan' };

        if (channelType.key === 'email_newsletter') return this.dispatchEmailNewsletter(row.config, draftByKey.get('email_newsletter'));

        return { status: 'skipped', error: 'Channel not implemented' };
    }

    private async dispatchEmailNewsletter(
        config: Record<string, unknown>,
        draft: { title: string; body: string } | undefined,
    ): Promise<{ status: ShoutoutDispatchStatus; error?: string; sentAt?: Date }> {
        if (!draft) return { status: 'failed', error: 'Draft not found' };

        const recipients = config.recipients;
        if (!Array.isArray(recipients) || recipients.length === 0 || !recipients.every((item) => typeof item === 'string'))
            return { status: 'failed', error: 'Invalid recipients' };

        const subjectPrefix = typeof config.subjectPrefix === 'string' ? config.subjectPrefix : '';
        const subject = `${subjectPrefix}${draft.title}`;

        try {
            for (const to of recipients) await this.emailClient.send({ to, subject, html: draft.body, text: draft.body });
            return { status: 'sent', sentAt: new Date() };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Send failed';
            return { status: 'failed', error: message };
        }
    }

    static computeFinalStatus(results: ShoutoutDispatchStatus[]): ShoutoutStatus {
        if (results.length === 0) return 'failed';
        const sentCount = results.filter((status) => status === 'sent').length;
        if (sentCount === results.length) return 'published';
        if (sentCount === 0) return 'failed';
        return 'partially_published';
    }
}
