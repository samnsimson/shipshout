import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BaseRepository, Draft, PublishRecord } from '@shipshout/database';

@Injectable()
export class DraftRepository extends BaseRepository<Draft> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(Draft, dataSource);
    }
}

@Injectable()
export class PublishRecordRepository extends BaseRepository<PublishRecord> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(PublishRecord, dataSource);
    }
}
