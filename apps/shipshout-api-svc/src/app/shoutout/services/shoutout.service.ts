import { Injectable, NotFoundException } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { ShoutoutChannelDraftEntity, ShoutoutDispatchLogEntity, ShoutoutEntity } from '@shipshout/database';
import { Observable } from 'rxjs';
import { ShoutoutDetailResponseDto, ShoutoutListResponseDto, ShoutoutResponseDto } from '../dto/shoutout.dto';
import { ShoutoutChannelDraftRepository } from '../repositories/shoutout-channel-draft.repository';
import { ShoutoutDispatchLogRepository } from '../repositories/shoutout-dispatch-log.repository';
import { ShoutoutRepository } from '../repositories/shoutout.repository';
import { ShoutoutEventsService } from './shoutout-events.service';

@Injectable()
export class ShoutoutService {
    constructor(
        private readonly shoutouts: ShoutoutRepository,
        private readonly drafts: ShoutoutChannelDraftRepository,
        private readonly dispatchLogs: ShoutoutDispatchLogRepository,
        private readonly events: ShoutoutEventsService,
    ) {}

    async listForUser(userId: string): Promise<ShoutoutListResponseDto> {
        const rows = await this.shoutouts.findByUserId(userId);
        return { shoutouts: rows.map((row) => this.toListDto(row)) };
    }

    async getById(userId: string, shoutoutId: string): Promise<ShoutoutDetailResponseDto> {
        const shoutout = await this.shoutouts.findByIdAndUserId(shoutoutId, userId);
        if (!shoutout) throw new NotFoundException('Shoutout not found');

        const [draftRows, logRows] = await Promise.all([this.drafts.findByShoutoutId(shoutoutId), this.dispatchLogs.findByShoutoutId(shoutoutId)]);
        return this.toDetailDto(shoutout, draftRows, logRows);
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

    private toListDto(shoutout: ShoutoutEntity): ShoutoutResponseDto {
        return {
            id: shoutout.id,
            title: shoutout.title,
            status: shoutout.status,
            linkedRepositoryId: shoutout.linkedRepositoryId,
            repositoryFullName: shoutout.linkedRepository?.fullName ?? 'Unknown repository',
            triggerType: shoutout.triggerEvent?.triggerType ?? 'release',
            createdAt: shoutout.createdAt.toISOString(),
        };
    }

    private toDetailDto(
        shoutout: ShoutoutEntity,
        draftRows: ShoutoutChannelDraftEntity[],
        logRows: ShoutoutDispatchLogEntity[],
    ): ShoutoutDetailResponseDto {
        return {
            ...this.toListDto(shoutout),
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
