jest.mock('@shipshout/email-client', () => ({ EmailClient: jest.fn() }));

import { ConfigService } from '@nestjs/config';
import { ShoutoutEntity } from '@shipshout/database';
import type { EmailClient } from '@shipshout/email-client';
import { AiGenerationService } from '../../ai/services/ai-generation.service';
import { RepositoryChannelRepository } from '../../channels/repositories/repository-channel.repository';
import { ShoutoutChannelDraftRepository } from '../repositories/shoutout-channel-draft.repository';
import { ShoutoutRepository } from '../repositories/shoutout.repository';
import { ShoutoutEventsService } from '../services/shoutout-events.service';
import { ShoutoutGenerationService } from '../services/shoutout-generation.service';
import { ShoutoutLimitService } from '../services/shoutout-limit.service';
import { UserEmailLookup } from '../services/user-email-lookup.service';

describe('ShoutoutGenerationService', () => {
    const shoutout: ShoutoutEntity = {
        id: 'shoutout-1',
        userId: 'user-1',
        linkedRepositoryId: 'repo-1',
        triggerEventId: 'event-1',
        title: 'Release v1.0.0',
        status: 'generating',
        sourceSummary: { tagName: 'v1.0.0' },
        createdAt: new Date('2026-08-12T00:00:00.000Z'),
        linkedRepository: { fullName: 'acme/widget' } as ShoutoutEntity['linkedRepository'],
        triggerEvent: {} as ShoutoutEntity['triggerEvent'],
    };

    const shoutouts = {
        findById: jest.fn(),
        save: jest.fn(),
    };
    const repositoryChannels = {
        findByLinkedRepositoryId: jest.fn(),
    };
    const shoutoutLimits = {
        getLimitsForUser: jest.fn(),
    };
    const drafts = {
        upsertDraft: jest.fn(),
    };
    const ai = {
        generateVariants: jest.fn(),
    };
    const emailClient = {
        send: jest.fn(),
    };
    const userEmailLookup = {
        findByUserId: jest.fn(),
    };
    const events = {
        publish: jest.fn(),
    };
    const config = {
        getOrThrow: jest.fn().mockReturnValue('http://localhost:3000'),
    };

    let service: ShoutoutGenerationService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new ShoutoutGenerationService(
            shoutouts as unknown as ShoutoutRepository,
            repositoryChannels as unknown as RepositoryChannelRepository,
            shoutoutLimits as unknown as ShoutoutLimitService,
            drafts as unknown as ShoutoutChannelDraftRepository,
            ai as unknown as AiGenerationService,
            emailClient as unknown as EmailClient,
            userEmailLookup as unknown as UserEmailLookup,
            events as unknown as ShoutoutEventsService,
            config as unknown as ConfigService,
        );
    });

    it('generates drafts, sends alert email, and marks ready_for_review', async () => {
        shoutouts.findById.mockResolvedValue(shoutout);
        repositoryChannels.findByLinkedRepositoryId.mockResolvedValue([
            { channelKey: 'email_alert', enabled: true, tone: 'professional' },
            { channelKey: 'email_newsletter', enabled: true, tone: 'professional' },
        ]);
        shoutoutLimits.getLimitsForUser.mockResolvedValue({ repos: 1, releasesPerMonth: 5, channels: ['email_alert', 'email_newsletter'] });
        ai.generateVariants.mockResolvedValue({ email_newsletter: { title: 'Shipped v1', body: 'We released v1.' } });
        userEmailLookup.findByUserId.mockResolvedValue('owner@example.com');
        shoutouts.save.mockImplementation(async (row) => row);

        await service.run('shoutout-1');

        expect(ai.generateVariants).toHaveBeenCalledWith({
            sourceSummary: shoutout.sourceSummary,
            channels: [{ key: 'email_newsletter', tone: 'professional' }],
            repoFullName: 'acme/widget',
        });
        expect(drafts.upsertDraft).toHaveBeenCalledWith({
            shoutoutId: 'shoutout-1',
            channelKey: 'email_newsletter',
            title: 'Shipped v1',
            body: 'We released v1.',
        });
        expect(emailClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'owner@example.com',
                subject: 'Draft ready: Release v1.0.0',
            }),
        );
        expect(shoutouts.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'ready_for_review' }));
        expect(events.publish).toHaveBeenCalledWith('shoutout-1', { status: 'ready_for_review' });
    });

    it('returns early when shoutout status is not generating', async () => {
        shoutouts.findById.mockResolvedValue({ ...shoutout, status: 'ready_for_review' });

        await service.run('shoutout-1');

        expect(ai.generateVariants).not.toHaveBeenCalled();
        expect(emailClient.send).not.toHaveBeenCalled();
        expect(shoutouts.save).not.toHaveBeenCalled();
    });

    it('skips alert email when email_alert is disabled', async () => {
        shoutouts.findById.mockResolvedValue(shoutout);
        repositoryChannels.findByLinkedRepositoryId.mockResolvedValue([{ channelKey: 'email_newsletter', enabled: true, tone: 'professional' }]);
        shoutoutLimits.getLimitsForUser.mockResolvedValue({ repos: 1, releasesPerMonth: 5, channels: ['email_newsletter'] });
        ai.generateVariants.mockResolvedValue({ email_newsletter: { title: 'Shipped v1', body: 'We released v1.' } });
        shoutouts.save.mockImplementation(async (row) => row);

        await service.run('shoutout-1');

        expect(emailClient.send).not.toHaveBeenCalled();
        expect(shoutouts.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'ready_for_review' }));
    });

    it('marks generation_failed when no generatable channels are enabled', async () => {
        shoutouts.findById.mockResolvedValue(shoutout);
        repositoryChannels.findByLinkedRepositoryId.mockResolvedValue([{ channelKey: 'email_alert', enabled: true, tone: 'professional' }]);
        shoutoutLimits.getLimitsForUser.mockResolvedValue({ repos: 1, releasesPerMonth: 5, channels: ['email_alert'] });
        shoutouts.save.mockImplementation(async (row) => row);

        await service.run('shoutout-1');

        expect(ai.generateVariants).not.toHaveBeenCalled();
        expect(drafts.upsertDraft).not.toHaveBeenCalled();
        expect(emailClient.send).not.toHaveBeenCalled();
        expect(shoutouts.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'generation_failed' }));
        expect(events.publish).toHaveBeenCalledWith('shoutout-1', { status: 'generation_failed' });
    });
});
