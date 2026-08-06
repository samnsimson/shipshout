import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository, Repository as ConnectedRepo } from '@shipshout/database';

@Injectable()
export class ConnectedRepoRepository extends BaseRepository<ConnectedRepo> {
    constructor(@InjectRepository(ConnectedRepo) repo: Repository<ConnectedRepo>) {
        super(repo);
    }

    findByExternalId(provider: ConnectedRepo['provider'], externalId: string) {
        return this.findOneBy({ provider, externalId });
    }

    findByExternalIdForWorkspace(workspaceId: string, provider: ConnectedRepo['provider'], externalId: string) {
        return this.findOneBy({ workspace: { id: workspaceId }, provider, externalId });
    }

    listForWorkspace(workspaceId: string) {
        return this.find({ where: { workspace: { id: workspaceId } } });
    }
}
