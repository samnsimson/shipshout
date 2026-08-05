import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository, Membership } from '@shipshout/database';

@Injectable()
export class MembershipRepository extends BaseRepository<Membership> {
    constructor(@InjectRepository(Membership) repo: Repository<Membership>) {
        super(repo);
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
