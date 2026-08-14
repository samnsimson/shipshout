import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository, Channel, ChannelConnection, ConnectionStatus } from '@shipshout/database';

@Injectable()
export class ChannelConnectionRepository extends BaseRepository<ChannelConnection> {
    constructor(@InjectRepository(ChannelConnection) repo: Repository<ChannelConnection>) {
        super(repo);
    }

    findActive(workspaceId: string, channel: Channel) {
        return this.findOne({
            where: {
                workspace: { id: workspaceId },
                type: channel,
                status: ConnectionStatus.Active,
            },
        });
    }
}
