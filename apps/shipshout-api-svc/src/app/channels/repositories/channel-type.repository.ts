import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { BaseRepository, ChannelTypeEntity } from '@shipshout/database';
import { DataSource } from 'typeorm';

@Injectable()
export class ChannelTypeRepository extends BaseRepository<ChannelTypeEntity> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(ChannelTypeEntity, dataSource);
    }

    findAllActive(): Promise<ChannelTypeEntity[]> {
        return this.find({ where: { isActive: true }, order: { sortOrder: 'ASC' } });
    }
}
