import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository, Draft } from '@shipshout/database';

@Injectable()
export class DraftRepository extends BaseRepository<Draft> {
    constructor(@InjectRepository(Draft) repo: Repository<Draft>) {
        super(repo);
    }

    listForWorkspace(workspaceId: string) {
        return this.find({
            where: { releaseEvent: { repository: { workspace: { id: workspaceId } } } },
            order: { createdAt: 'DESC' },
        });
    }

    findInWorkspace(workspaceId: string, draftId: string) {
        return this.findOne({
            where: {
                id: draftId,
                releaseEvent: { repository: { workspace: { id: workspaceId } } },
            },
        });
    }
}
