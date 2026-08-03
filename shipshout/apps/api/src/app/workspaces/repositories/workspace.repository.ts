import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BaseRepository, Workspace, Membership } from '@shipshout/database';

@Injectable()
export class WorkspaceRepository extends BaseRepository<Workspace> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(Workspace, dataSource);
    }
}

@Injectable()
export class MembershipRepository extends BaseRepository<Membership> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(Membership, dataSource);
    }

    findForUser(userId: string) {
        return this.find({ where: { user: { id: userId } } });
    }
}
