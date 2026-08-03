import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BaseRepository, BrandProfile } from '@shipshout/database';

@Injectable()
export class BrandProfileRepository extends BaseRepository<BrandProfile> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(BrandProfile, dataSource);
    }

    findForWorkspace(workspaceId: string) {
        return this.findOne({ where: { workspace: { id: workspaceId } } });
    }
}
