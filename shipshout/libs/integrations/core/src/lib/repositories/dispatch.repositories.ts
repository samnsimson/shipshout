import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository, Draft, PublishRecord } from '@shipshout/database';

@Injectable()
export class DraftRepository extends BaseRepository<Draft> {
    constructor(@InjectRepository(Draft) repo: Repository<Draft>) {
        super(repo);
    }
}

@Injectable()
export class PublishRecordRepository extends BaseRepository<PublishRecord> {
    constructor(@InjectRepository(PublishRecord) repo: Repository<PublishRecord>) {
        super(repo);
    }
}
