import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { BaseRepository, RepositoryTriggerEntity } from '@shipshout/database';
import { DataSource } from 'typeorm';

@Injectable()
export class RepositoryTriggerRepository extends BaseRepository<RepositoryTriggerEntity> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(RepositoryTriggerEntity, dataSource);
    }

    findByLinkedRepositoryId(linkedRepositoryId: string): Promise<RepositoryTriggerEntity | null> {
        return this.findOne({ where: { linkedRepositoryId } });
    }

    async ensureForLinkedRepository(linkedRepositoryId: string): Promise<RepositoryTriggerEntity> {
        const existing = await this.findByLinkedRepositoryId(linkedRepositoryId);
        if (existing) return existing;
        return this.save({ linkedRepositoryId, release: false, tagPush: false, branchPush: false });
    }
}
