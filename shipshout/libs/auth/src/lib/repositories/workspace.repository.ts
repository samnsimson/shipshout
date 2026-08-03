import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BaseRepository, Workspace } from '@shipshout/database';

@Injectable()
export class WorkspaceRepository extends BaseRepository<Workspace> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(Workspace, dataSource);
    }
}
