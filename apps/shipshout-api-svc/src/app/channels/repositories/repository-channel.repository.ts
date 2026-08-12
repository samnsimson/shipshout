import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { BaseRepository, RepositoryChannelEntity } from '@shipshout/database';
import { DataSource } from 'typeorm';

@Injectable()
export class RepositoryChannelRepository extends BaseRepository<RepositoryChannelEntity> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(RepositoryChannelEntity, dataSource);
    }

    findByLinkedRepositoryId(linkedRepositoryId: string): Promise<RepositoryChannelEntity[]> {
        return this.find({ where: { linkedRepositoryId }, order: { channelKey: 'ASC' } });
    }

    findByLinkedRepositoryAndKey(linkedRepositoryId: string, channelKey: string): Promise<RepositoryChannelEntity | null> {
        return this.findOne({ where: { linkedRepositoryId, channelKey } });
    }
}
