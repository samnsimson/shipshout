import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { ShoutoutChannelDraftEntity, ShoutoutDispatchLogEntity, ShoutoutEntity } from '@shipshout/database';
import { Observable } from 'rxjs';
import { ShoutoutDetailResponseDto, ShoutoutListResponseDto, ShoutoutResponseDto, ShoutoutStatusResponseDto } from '../dto/shoutout.dto';
import { UpdateShoutoutDraftDto } from '../dto/update-shoutout-draft.dto';
import { ShoutoutChannelDraftRepository } from '../repositories/shoutout-channel-draft.repository';
import { ShoutoutDispatchLogRepository } from '../repositories/shoutout-dispatch-log.repository';
import { ShoutoutRepository } from '../repositories/shoutout.repository';
import { ShoutoutStatusUtils } from '../utils/shoutout-status.utils';
import { ShoutoutEventsService } from './shoutout-events.service';
import { ShoutoutGenerationService } from './shoutout-generation.service';
import { ShoutoutQueueService } from './shoutout-queue.service';

@Injectable()
export class ShoutoutService {
    constructor(
        private readonly shoutouts: ShoutoutRepository,
        private readonly drafts: ShoutoutChannelDraftRepository,
        private readonly dispatchLogs: ShoutoutDispatchLogRepository,
        private readonly events: ShoutoutEventsService,
        private readonly queue: ShoutoutQueueService,
        private readonly generation: ShoutoutGenerationService,
    ) {}

    async listForUser(userId: string): Promise<ShoutoutListResponseDto> {
        const rows = await this.shoutouts.findByUserId(userId);
        const failureIds = await this.dispatchLogs.findFailureFlagsByShoutoutIds(rows.map((row) => row.id));
        return { shoutouts: rows.map((row) => this.toListDto(row, failureIds.has(row.id))) };
    }

    async getById(userId: string, shoutoutId: string): Promise<ShoutoutDetailResponseDto> {
        const shoutout = await this.shoutouts.findByIdAndUserId(shoutoutId, userId);
        if (!shoutout) throw new NotFoundException('Shoutout not found');

        const [draftRows, logRows] = await Promise.all([this.drafts.findByShoutoutId(shoutoutId), this.dispatchLogs.findByShoutoutId(shoutoutId)]);
        return this.toDetailDto(shoutout, draftRows, logRows);
    }

    async updateDraft(userId: string, shoutoutId: string, channelKey: string, body: UpdateShoutoutDraftDto): Promise<ShoutoutDetailResponseDto> {
        const shoutout = await this.shoutouts.findByIdAndUserId(shoutoutId, userId);
        if (!shoutout) throw new NotFoundException('Shoutout not found');
        if (shoutout.status !== 'ready_for_review') throw new ConflictException(`Cannot edit drafts while shoutout status is ${shoutout.status}`);

        const updated = await this.drafts.updateDraft({ shoutoutId, channelKey, title: body.title, body: body.body });
        if (!updated) throw new NotFoundException('Draft not found');

        return this.getById(userId, shoutoutId);
    }

    async regenerateDraft(userId: string, shoutoutId: string, channelKey: string): Promise<ShoutoutDetailResponseDto> {
        const shoutout = await this.shoutouts.findByIdAndUserId(shoutoutId, userId);
        if (!shoutout) throw new NotFoundException('Shoutout not found');
        if (shoutout.status !== 'ready_for_review') throw new ConflictException(`Cannot regenerate drafts while shoutout status is ${shoutout.status}`);

        const draftRows = await this.drafts.findByShoutoutId(shoutoutId);
        if (!draftRows.some((row) => row.channelKey === channelKey)) throw new NotFoundException('Draft not found');

        await this.generation.regenerateChannel(shoutoutId, channelKey);
        return this.getById(userId, shoutoutId);
    }

    async publish(userId: string, shoutoutId: string): Promise<ShoutoutStatusResponseDto> {
        const shoutout = await this.shoutouts.findByIdAndUserId(shoutoutId, userId);
        if (!shoutout) throw new NotFoundException('Shoutout not found');
        if (!ShoutoutStatusUtils.canTransition(shoutout.status, 'publishing'))
            throw new ConflictException(`Cannot publish shoutout while status is ${shoutout.status}`);

        const draftRows = await this.drafts.findByShoutoutId(shoutoutId);
        if (draftRows.length === 0) throw new ConflictException('Cannot publish shoutout without channel drafts');

        await this.shoutouts.save({ ...shoutout, status: 'publishing' });
        await this.events.publish(shoutoutId, { status: 'publishing' });
        await this.queue.addDispatchJob({ shoutoutId });
        return { status: 'publishing' };
    }

    async retryGeneration(userId: string, shoutoutId: string): Promise<ShoutoutStatusResponseDto> {
        const shoutout = await this.shoutouts.findByIdAndUserId(shoutoutId, userId);
        if (!shoutout) throw new NotFoundException('Shoutout not found');

        const draftRows = await this.drafts.findByShoutoutId(shoutoutId);
        const canRetry =
            shoutout.status === 'generation_failed' ||
            shoutout.status === 'generating' ||
            (shoutout.status === 'ready_for_review' && draftRows.length === 0);
        if (!canRetry) throw new ConflictException(`Cannot retry generation while shoutout status is ${shoutout.status}`);

        await this.shoutouts.save({ ...shoutout, status: 'generating' });
        await this.events.publish(shoutoutId, { status: 'generating' });
        await this.queue.addGenerationJob({ shoutoutId }, { replace: true });
        return { status: 'generating' };
    }

    streamEvents(userId: string, shoutoutId: string): Observable<MessageEvent> {
        return new Observable((subscriber) => {
            void this.shoutouts
                .findByIdAndUserId(shoutoutId, userId)
                .then((shoutout) => {
                    if (!shoutout) {
                        subscriber.error(new NotFoundException('Shoutout not found'));
                        return;
                    }

                    const unsubscribe = this.events.subscribe(shoutoutId, (event) => subscriber.next({ data: event }));
                    subscriber.add(unsubscribe);
                })
                .catch((error: unknown) => subscriber.error(error));
        });
    }

    private toListDto(shoutout: ShoutoutEntity, hasDispatchFailure = false): ShoutoutResponseDto {
        return {
            id: shoutout.id,
            title: shoutout.title,
            status: shoutout.status,
            linkedRepositoryId: shoutout.linkedRepositoryId,
            repositoryFullName: shoutout.linkedRepository?.fullName ?? 'Unknown repository',
            triggerType: shoutout.triggerEvent?.triggerType ?? 'release',
            createdAt: shoutout.createdAt.toISOString(),
            hasDispatchFailure,
        };
    }

    private toDetailDto(
        shoutout: ShoutoutEntity,
        draftRows: ShoutoutChannelDraftEntity[],
        logRows: ShoutoutDispatchLogEntity[],
    ): ShoutoutDetailResponseDto {
        return {
            ...this.toListDto(
                shoutout,
                logRows.some((row) => row.status === 'failed'),
            ),
            sourceSummary: shoutout.sourceSummary,
            triggerEventId: shoutout.triggerEventId,
            drafts: draftRows.map((row) => ({
                channelKey: row.channelKey,
                title: row.title,
                body: row.body,
                editedAt: row.editedAt?.toISOString() ?? null,
            })),
            dispatchLogs: logRows.map((row) => ({
                channelKey: row.channelKey,
                status: row.status,
                error: row.error,
                sentAt: row.sentAt?.toISOString() ?? null,
            })),
        };
    }
}
