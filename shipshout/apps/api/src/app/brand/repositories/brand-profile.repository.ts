import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository, BrandProfile } from '@shipshout/database';

@Injectable()
export class BrandProfileRepository extends BaseRepository<BrandProfile> {
    constructor(@InjectRepository(BrandProfile) repo: Repository<BrandProfile>) {
        super(repo);
    }

    findForWorkspace(workspaceId: string) {
        return this.findOne({ where: { workspace: { id: workspaceId } } });
    }
}
