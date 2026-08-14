jest.mock('@shipshout/email-client', () => ({ EmailClient: jest.fn() }));

import { ShoutoutEntity } from '@shipshout/database';
import type { EmailClient } from '@shipshout/email-client';
import { ChannelTypeRepository } from '../../channels/repositories/channel-type.repository';
import { RepositoryChannelRepository } from '../../channels/repositories/repository-channel.repository';
import { ShoutoutChannelDraftRepository } from '../repositories/shoutout-channel-draft.repository';
import { ShoutoutDispatchLogRepository } from '../repositories/shoutout-dispatch-log.repository';
import { ShoutoutRepository } from '../repositories/shoutout.repository';
import { ShoutoutDispatchService } from '../services/shoutout-dispatch.service';
import { ShoutoutEventsService } from '../services/shoutout-events.service';
import { ShoutoutLimitService } from '../services/shoutout-limit.service';

describe('ShoutoutDispatchService', () => {
    const shoutout: ShoutoutEntity = {
        id: 'shoutout-1',
        userId: 'user-1',
        linkedRepositoryId: 'repo-1',
        triggerEventId: 'event-1',
        title: 'Release v1.0.0',
        status: 'publishing',
        sourceSummary: { tagName: 'v1.0.0' },
        createdAt: new Date('2026-08-12T00:00:00.000Z'),
        linkedRepository: {} as ShoutoutEntity['linkedRepository'],
        triggerEvent: {} as ShoutoutEntity['triggerEvent'],
    };

    const publishTypes = [
        { key: 'email_newsletter', kind: 'publish', isActive: true },
        { key: 'x', kind: 'publish', isActive: true },
    ];

    const shoutouts = { findById: jest.fn(), save: jest.fn() };
    const channelTypes = { findAllActive: jest.fn() };
    const repositoryChannels = { findByLinkedRepositoryId: jest.fn() };
    const shoutoutLimits = { getLimitsForUser: jest.fn() };
    const drafts = { findByShoutoutId: jest.fn() };
    const dispatchLogs = { createLog: jest.fn() };
    const emailClient = { send: jest.fn() };
    const events = { publish: jest.fn() };

    let service: ShoutoutDispatchService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new ShoutoutDispatchService(
            shoutouts as unknown as ShoutoutRepository,
            channelTypes as unknown as ChannelTypeRepository,
            repositoryChannels as unknown as RepositoryChannelRepository,
            shoutoutLimits as unknown as ShoutoutLimitService,
            drafts as unknown as ShoutoutChannelDraftRepository,
            dispatchLogs as unknown as ShoutoutDispatchLogRepository,
            emailClient as unknown as EmailClient,
            events as unknown as ShoutoutEventsService,
        );
    });

    it('sends newsletter email and marks shoutout published', async () => {
        shoutouts.findById.mockResolvedValue(shoutout);
        channelTypes.findAllActive.mockResolvedValue([{ key: 'email_newsletter', kind: 'publish', isActive: true }]);
        repositoryChannels.findByLinkedRepositoryId.mockResolvedValue([
            { channelKey: 'email_newsletter', enabled: true, config: { recipients: ['list@example.com'] } },
        ]);
        shoutoutLimits.getLimitsForUser.mockResolvedValue({ channels: ['email_newsletter'] });
        drafts.findByShoutoutId.mockResolvedValue([{ channelKey: 'email_newsletter', title: 'Shipped v1', body: '<p>We released v1.</p>' }]);
        emailClient.send.mockResolvedValue(undefined);
        shoutouts.save.mockImplementation(async (row) => row);

        await service.run('shoutout-1');

        expect(emailClient.send).toHaveBeenCalledWith({
            to: 'list@example.com',
            subject: 'Shipped v1',
            html: '<p>We released v1.</p>',
            text: '<p>We released v1.</p>',
        });
        expect(dispatchLogs.createLog).toHaveBeenCalledWith(
            expect.objectContaining({ channelKey: 'email_newsletter', status: 'sent' }),
        );
        expect(shoutouts.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'published' }));
        expect(events.publish).toHaveBeenCalledWith('shoutout-1', { status: 'published' });
    });

    it('marks published when one channel sends and another is skipped', async () => {
        shoutouts.findById.mockResolvedValue(shoutout);
        channelTypes.findAllActive.mockResolvedValue(publishTypes);
        repositoryChannels.findByLinkedRepositoryId.mockResolvedValue([
            { channelKey: 'email_newsletter', enabled: true, config: { recipients: ['list@example.com'] } },
            { channelKey: 'x', enabled: true, config: {} },
        ]);
        shoutoutLimits.getLimitsForUser.mockResolvedValue({ channels: ['email_newsletter', 'x'] });
        drafts.findByShoutoutId.mockResolvedValue([{ channelKey: 'email_newsletter', title: 'Shipped v1', body: 'Body' }]);
        emailClient.send.mockResolvedValue(undefined);
        shoutouts.save.mockImplementation(async (row) => row);

        await service.run('shoutout-1');

        expect(shoutouts.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'published' }));
        expect(events.publish).toHaveBeenCalledWith('shoutout-1', { status: 'published' });
    });

    it('marks failed when newsletter send throws', async () => {
        shoutouts.findById.mockResolvedValue(shoutout);
        channelTypes.findAllActive.mockResolvedValue([{ key: 'email_newsletter', kind: 'publish', isActive: true }]);
        repositoryChannels.findByLinkedRepositoryId.mockResolvedValue([
            { channelKey: 'email_newsletter', enabled: true, config: { recipients: ['list@example.com'] } },
        ]);
        shoutoutLimits.getLimitsForUser.mockResolvedValue({ channels: ['email_newsletter'] });
        drafts.findByShoutoutId.mockResolvedValue([{ channelKey: 'email_newsletter', title: 'Shipped v1', body: 'Body' }]);
        emailClient.send.mockRejectedValue(new Error('Resend down'));
        shoutouts.save.mockImplementation(async (row) => row);

        await service.run('shoutout-1');

        expect(dispatchLogs.createLog).toHaveBeenCalledWith(
            expect.objectContaining({ channelKey: 'email_newsletter', status: 'failed', error: 'Resend down' }),
        );
        expect(shoutouts.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
        expect(events.publish).toHaveBeenCalledWith('shoutout-1', { status: 'failed' });
    });

    it('returns ready_for_review when all channels are skipped', async () => {
        shoutouts.findById.mockResolvedValue(shoutout);
        channelTypes.findAllActive.mockResolvedValue([{ key: 'email_newsletter', kind: 'publish', isActive: true }]);
        repositoryChannels.findByLinkedRepositoryId.mockResolvedValue([
            { channelKey: 'email_newsletter', enabled: false, config: { recipients: ['list@example.com'] } },
        ]);
        shoutoutLimits.getLimitsForUser.mockResolvedValue({ channels: ['email_alert'] });
        drafts.findByShoutoutId.mockResolvedValue([]);
        shoutouts.save.mockImplementation(async (row) => row);

        await service.run('shoutout-1');

        expect(emailClient.send).not.toHaveBeenCalled();
        expect(dispatchLogs.createLog).toHaveBeenCalledWith(
            expect.objectContaining({ channelKey: 'email_newsletter', status: 'skipped', error: 'Channel disabled' }),
        );
        expect(shoutouts.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'ready_for_review' }));
    });

    it('returns early when shoutout status is not publishing', async () => {
        shoutouts.findById.mockResolvedValue({ ...shoutout, status: 'ready_for_review' });

        await service.run('shoutout-1');

        expect(channelTypes.findAllActive).not.toHaveBeenCalled();
        expect(shoutouts.save).not.toHaveBeenCalled();
    });
});

describe('ShoutoutDispatchService.computeFinalStatus', () => {
    it('returns published when all channels sent', () => {
        expect(ShoutoutDispatchService.computeFinalStatus(['sent', 'sent'])).toBe('published');
    });

    it('returns partially_published when some channels sent and some failed', () => {
        expect(ShoutoutDispatchService.computeFinalStatus(['sent', 'failed'])).toBe('partially_published');
    });

    it('returns failed when all channels failed or only failures with skips', () => {
        expect(ShoutoutDispatchService.computeFinalStatus(['failed', 'skipped'])).toBe('failed');
    });

    it('returns ready_for_review when all channels skipped', () => {
        expect(ShoutoutDispatchService.computeFinalStatus(['skipped', 'skipped'])).toBe('ready_for_review');
    });

    it('returns published when some sent and rest skipped with no failures', () => {
        expect(ShoutoutDispatchService.computeFinalStatus(['sent', 'skipped'])).toBe('published');
    });
});
