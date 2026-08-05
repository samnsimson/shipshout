import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository, ReleaseEvent, BrandProfile, Draft } from '@shipshout/database';

@Injectable()
export class ReleaseEventRepository extends BaseRepository<ReleaseEvent> {
    constructor(@InjectRepository(ReleaseEvent) repo: Repository<ReleaseEvent>) {
        super(repo);
    }
}

@Injectable()
export class BrandProfileRepository extends BaseRepository<BrandProfile> {
    constructor(@InjectRepository(BrandProfile) repo: Repository<BrandProfile>) {
        super(repo);
    }

    findForWorkspace(workspaceId: string) {
        return this.findOne({ where: { workspace: { id: workspaceId } } });
    }
}

@Injectable()
export class DraftRepository extends BaseRepository<Draft> {
    constructor(@InjectRepository(Draft) repo: Repository<Draft>) {
        super(repo);
    }
}
