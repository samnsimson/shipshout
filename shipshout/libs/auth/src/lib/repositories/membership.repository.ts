import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BaseRepository, Membership } from '@shipshout/database';

@Injectable()
export class MembershipRepository extends BaseRepository<Membership> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(Membership, dataSource);
    }

    findForUserInWorkspace(userId: string, workspaceId: string) {
        return this.findOne({
            where: { user: { id: userId }, workspace: { id: workspaceId } },
        });
    }

    findForUser(userId: string) {
        return this.find({ where: { user: { id: userId } } });
    }
}
