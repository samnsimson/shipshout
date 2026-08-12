import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { BaseRepository, TriggerEventEntity } from '@shipshout/database';
import { DataSource } from 'typeorm';

@Injectable()
export class TriggerEventRepository extends BaseRepository<TriggerEventEntity> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(TriggerEventEntity, dataSource);
    }

    findByGithubDeliveryId(githubDeliveryId: string): Promise<TriggerEventEntity | null> {
        return this.findOne({ where: { githubDeliveryId } });
    }

    findRecentByLinkedRepositoryId(linkedRepositoryId: string, limit: number): Promise<TriggerEventEntity[]> {
        return this.find({ where: { linkedRepositoryId }, order: { createdAt: 'DESC' }, take: limit });
    }
}
