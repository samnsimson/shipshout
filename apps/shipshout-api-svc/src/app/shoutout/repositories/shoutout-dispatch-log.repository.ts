import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { BaseRepository, ShoutoutDispatchLogEntity, ShoutoutDispatchStatus } from '@shipshout/database';
import { DataSource } from 'typeorm';

@Injectable()
export class ShoutoutDispatchLogRepository extends BaseRepository<ShoutoutDispatchLogEntity> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(ShoutoutDispatchLogEntity, dataSource);
    }

    findByShoutoutId(shoutoutId: string): Promise<ShoutoutDispatchLogEntity[]> {
        return this.find({ where: { shoutoutId }, order: { channelKey: 'ASC' } });
    }

    async findFailureFlagsByShoutoutIds(shoutoutIds: string[]): Promise<Set<string>> {
        if (shoutoutIds.length === 0) return new Set();
        const rows = await this.createQueryBuilder('log')
            .select('log.shoutout_id', 'shoutoutId')
            .where('log.shoutout_id IN (:...shoutoutIds)', { shoutoutIds })
            .andWhere('log.status = :status', { status: 'failed' })
            .groupBy('log.shoutout_id')
            .getRawMany<{ shoutoutId: string }>();
        return new Set(rows.map((row) => row.shoutoutId));
    }

    async createLog(params: {
        shoutoutId: string;
        channelKey: string;
        status: ShoutoutDispatchStatus;
        error?: string | null;
        sentAt?: Date | null;
    }): Promise<void> {
        await this.save({ ...params, error: params.error ?? null, sentAt: params.sentAt ?? null });
    }
}
