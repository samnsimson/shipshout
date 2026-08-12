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
