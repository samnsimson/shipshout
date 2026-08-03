import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BaseRepository, ReleaseEvent, BrandProfile, Draft } from '@shipshout/database';

@Injectable()
export class ReleaseEventRepository extends BaseRepository<ReleaseEvent> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(ReleaseEvent, dataSource);
    }
}

@Injectable()
export class BrandProfileRepository extends BaseRepository<BrandProfile> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(BrandProfile, dataSource);
    }

    findForWorkspace(workspaceId: string) {
        return this.findOne({ where: { workspace: { id: workspaceId } } });
    }
}

@Injectable()
export class DraftRepository extends BaseRepository<Draft> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(Draft, dataSource);
    }
}
