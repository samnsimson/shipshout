import { Injectable } from '@nestjs/common';
import { Channel } from '@shipshout/database';
import { decryptSecret } from '@shipshout/shared-util';
import type { ConnectionsPort } from '@shipshout/integrations-core';
import { ChannelConnectionRepository } from './channel-connection.repository';

@Injectable()
export class WorkerConnectionsService implements ConnectionsPort {
    constructor(private connections: ChannelConnectionRepository) {}

    getActive(workspaceId: string, channel: Channel) {
        return this.connections.findActive(workspaceId, channel);
    }

    async getActiveAccessToken(workspaceId: string, channel: Channel): Promise<string> {
        const conn = await this.getActive(workspaceId, channel);
        if (!conn) throw new Error(`No active ${channel} connection`);
        return decryptSecret(conn.accessToken);
    }
}
