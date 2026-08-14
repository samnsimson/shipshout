import { ShoutoutEntity } from '@shipshout/database';
import { ShoutoutChannelDraftRepository } from '../repositories/shoutout-channel-draft.repository';
import { ShoutoutDispatchLogRepository } from '../repositories/shoutout-dispatch-log.repository';
import { ShoutoutRepository } from '../repositories/shoutout.repository';
import { ShoutoutEventsService } from '../services/shoutout-events.service';
import { ShoutoutQueueService } from '../services/shoutout-queue.service';
import { ShoutoutService } from '../services/shoutout.service';

describe('ShoutoutService.listForUser', () => {
    const shoutout: ShoutoutEntity = {
        id: 'shoutout-1',
        userId: 'user-1',
        linkedRepositoryId: 'repo-1',
        triggerEventId: 'event-1',
        title: 'Release v1',
        status: 'failed',
        sourceSummary: {},
        createdAt: new Date('2026-08-12T00:00:00.000Z'),
        linkedRepository: { fullName: 'acme/app' } as ShoutoutEntity['linkedRepository'],
        triggerEvent: { triggerType: 'release' } as ShoutoutEntity['triggerEvent'],
    };

    const shoutouts = { findByUserId: jest.fn() };
    const drafts = { findByShoutoutId: jest.fn() };
    const dispatchLogs = { findFailureFlagsByShoutoutIds: jest.fn() };
    const events = { publish: jest.fn(), subscribe: jest.fn() };
    const queue = { addDispatchJob: jest.fn(), addGenerationJob: jest.fn() };

    let service: ShoutoutService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new ShoutoutService(
            shoutouts as unknown as ShoutoutRepository,
            drafts as unknown as ShoutoutChannelDraftRepository,
            dispatchLogs as unknown as ShoutoutDispatchLogRepository,
            events as unknown as ShoutoutEventsService,
            queue as unknown as ShoutoutQueueService,
        );
    });

    it('sets hasDispatchFailure true when failure flags include shoutout id', async () => {
        shoutouts.findByUserId.mockResolvedValue([shoutout]);
        dispatchLogs.findFailureFlagsByShoutoutIds.mockResolvedValue(new Set(['shoutout-1']));

        const result = await service.listForUser('user-1');

        expect(dispatchLogs.findFailureFlagsByShoutoutIds).toHaveBeenCalledWith(['shoutout-1']);
        expect(result.shoutouts[0].hasDispatchFailure).toBe(true);
    });

    it('sets hasDispatchFailure false when shoutout has no failed dispatch logs', async () => {
        shoutouts.findByUserId.mockResolvedValue([shoutout]);
        dispatchLogs.findFailureFlagsByShoutoutIds.mockResolvedValue(new Set());

        const result = await service.listForUser('user-1');

        expect(result.shoutouts[0].hasDispatchFailure).toBe(false);
    });
});
