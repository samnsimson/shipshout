import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BaseRepository, Repository as ConnectedRepo } from '@shipshout/database';

@Injectable()
export class ConnectedRepoRepository extends BaseRepository<ConnectedRepo> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(ConnectedRepo, dataSource);
    }

    findByExternalId(provider: ConnectedRepo['provider'], externalId: string) {
        return this.findOneBy({ provider, externalId });
    }

    listForWorkspace(workspaceId: string) {
        return this.find({ where: { workspace: { id: workspaceId } } });
    }
}
