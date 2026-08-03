import { Injectable } from '@nestjs/common';
import { Repository as OrmRepo } from 'typeorm';
import { ChannelConnection, ConnectionStatus, Channel } from '@shipshout/data-entities';
import { decryptSecret } from '@shipshout/shared-util';
import type { ConnectionsPort } from '@shipshout/integrations-core';

@Injectable()
export class WorkerConnectionsService implements ConnectionsPort {
  constructor(private connections: OrmRepo<ChannelConnection>) {}

  getActive(workspaceId: string, channel: Channel) {
    return this.connections.findOne({
      where: { workspace: { id: workspaceId }, type: channel, status: ConnectionStatus.Active },
    });
  }

  async getActiveAccessToken(workspaceId: string, channel: Channel): Promise<string> {
    const conn = await this.getActive(workspaceId, channel);
    if (!conn) throw new Error(`No active ${channel} connection`);
    return decryptSecret(conn.accessToken);
  }
}
