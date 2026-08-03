import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BaseRepository, Channel, ChannelConnection, ConnectionStatus } from '@shipshout/database';

@Injectable()
export class ChannelConnectionRepository extends BaseRepository<ChannelConnection> {
    constructor(@InjectDataSource() dataSource: DataSource) {
        super(ChannelConnection, dataSource);
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
