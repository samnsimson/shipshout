import { Injectable, NotFoundException } from '@nestjs/common';
import { TriggerEventEntity } from '@shipshout/database';
import { LinkedRepositoryRepository } from '../../repository/repositories/linked-repository.repository';
import { TriggerEventListResponseDto, TriggerEventResponseDto } from '../dto/trigger.dto';
import { TriggerEventRepository } from '../repositories/trigger-event.repository';

@Injectable()
export class TriggerEventService {
    constructor(
        private readonly linkedRepositories: LinkedRepositoryRepository,
        private readonly triggerEvents: TriggerEventRepository,
    ) {}

    async listRecent(userId: string, repositoryId: string, limit = 20): Promise<TriggerEventListResponseDto> {
        await this.requireLinkedRepository(userId, repositoryId);
        const events = await this.triggerEvents.findRecentByLinkedRepositoryId(repositoryId, limit);
        return { events: events.map((event) => this.toDto(event)) };
    }

    private async requireLinkedRepository(userId: string, repositoryId: string) {
        const repo = await this.linkedRepositories.findOne({ where: { id: repositoryId, userId } });
        if (!repo) throw new NotFoundException('Linked repository not found');
        return repo;
    }

    private toDto(event: TriggerEventEntity): TriggerEventResponseDto {
        return {
            id: event.id,
            eventType: event.eventType,
            triggerType: event.triggerType,
            summary: event.summary,
            status: event.status,
            shoutoutId: event.shoutoutId,
            createdAt: event.createdAt.toISOString(),
        };
    }
}
