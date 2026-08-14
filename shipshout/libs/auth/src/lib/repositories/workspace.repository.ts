import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository, Workspace } from '@shipshout/database';

@Injectable()
export class WorkspaceRepository extends BaseRepository<Workspace> {
    constructor(@InjectRepository(Workspace) repo: Repository<Workspace>) {
        super(repo);
    }
}
