import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BaseRepository, Draft } from '@shipshout/database';

@Injectable()
export class DraftRepository extends BaseRepository<Draft> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(Draft, dataSource);
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
