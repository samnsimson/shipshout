import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository, Workspace, Membership } from '@shipshout/database';

@Injectable()
export class WorkspaceRepository extends BaseRepository<Workspace> {
    constructor(@InjectRepository(Workspace) repo: Repository<Workspace>) {
        super(repo);
    }
}

@Injectable()
export class MembershipRepository extends BaseRepository<Membership> {
    constructor(@InjectRepository(Membership) repo: Repository<Membership>) {
        super(repo);
    }

    findForUser(userId: string) {
        return this.find({ where: { user: { id: userId } } });
    }
}
