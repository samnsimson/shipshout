import { Injectable, NotFoundException } from '@nestjs/common';
import { ShoutoutEntity } from '@shipshout/database';
import { ShoutoutDetailResponseDto, ShoutoutListResponseDto, ShoutoutResponseDto } from '../dto/shoutout.dto';
import { ShoutoutRepository } from '../repositories/shoutout.repository';

@Injectable()
export class ShoutoutService {
    constructor(private readonly shoutouts: ShoutoutRepository) {}

    async listForUser(userId: string): Promise<ShoutoutListResponseDto> {
        const rows = await this.shoutouts.findByUserId(userId);
        return { shoutouts: rows.map((row) => this.toListDto(row)) };
    }

    async getById(userId: string, shoutoutId: string): Promise<ShoutoutDetailResponseDto> {
        const shoutout = await this.shoutouts.findByIdAndUserId(shoutoutId, userId);
        if (!shoutout) throw new NotFoundException('Shoutout not found');
        return this.toDetailDto(shoutout);
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

    private toDetailDto(shoutout: ShoutoutEntity): ShoutoutDetailResponseDto {
        return {
            ...this.toListDto(shoutout),
            sourceSummary: shoutout.sourceSummary,
            triggerEventId: shoutout.triggerEventId,
        };
    }
}
