import { Injectable } from '@nestjs/common';
import { Repository as OrmRepo } from 'typeorm';
import { ChannelConnection, ConnectionStatus, Channel } from '@shipshout/data-entities';
import { encryptSecret, decryptSecret } from '@shipshout/shared-util';
import { channelOAuthConfig, channelSlug } from './oauth.config.js';

@Injectable()
export class ConnectionsService {
  constructor(private connections: OrmRepo<ChannelConnection>) {}

  async saveTokens(
    workspaceId: string,
    channel: Channel,
    tokens: { accessToken: string; refreshToken?: string; externalAccountId?: string },
  ) {
    let conn = await this.connections.findOne({
      where: { workspace: { id: workspaceId }, type: channel },
    });
    if (!conn)
      conn = this.connections.create({
        workspace: { id: workspaceId } as ChannelConnection['workspace'],
        type: channel,
      });
    conn.accessToken = encryptSecret(tokens.accessToken);
    conn.refreshToken = tokens.refreshToken ? encryptSecret(tokens.refreshToken) : undefined;
    conn.externalAccountId = tokens.externalAccountId;
    conn.status = ConnectionStatus.Active;
    return this.connections.save(conn);
  }

  list(workspaceId: string) {
    return this.connections
      .find({ where: { workspace: { id: workspaceId } } })
      .then((cs) => cs.map((c) => ({ id: c.id, type: c.type, status: c.status })));
  }

  async getActive(workspaceId: string, channel: Channel) {
    return this.connections.findOne({
      where: { workspace: { id: workspaceId }, type: channel, status: ConnectionStatus.Active },
    });
  }

  async getActiveAccessToken(workspaceId: string, channel: Channel): Promise<string> {
    const conn = await this.getActive(workspaceId, channel);
    if (!conn) throw new Error(`No active ${channel} connection`);
    return decryptSecret(conn.accessToken);
  }

  buildAuthUrl(workspaceId: string, channel: Channel): string {
    const cfg = channelOAuthConfig(channel);
    const redirect = `${process.env.API_BASE_URL}/api/workspaces/${workspaceId}/connections/${channelSlug(channel)}/callback`;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: cfg.clientId,
      redirect_uri: redirect,
      scope: cfg.scopes,
      state: workspaceId,
    });
    return `${cfg.authUrl}?${params}`;
  }

  async exchangeCode(workspaceId: string, channel: Channel, code: string) {
    const cfg = channelOAuthConfig(channel);
    const redirect = `${process.env.API_BASE_URL}/api/workspaces/${workspaceId}/connections/${channelSlug(channel)}/callback`;
    const res = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirect,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
      }),
    });
    if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
    };
    await this.saveTokens(workspaceId, channel, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    });
  }
}
