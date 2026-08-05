import { Injectable } from '@nestjs/common';
import { Channel, ConnectionStatus } from '@shipshout/database';
import { encryptSecret, decryptSecret } from '@shipshout/shared-util';
import { channelOAuthConfig, channelSlug } from './oauth.config';
import { ChannelConnectionRepository } from './channel-connection.repository';

@Injectable()
export class ConnectionsService {
    constructor(private connections: ChannelConnectionRepository) {}

    async saveTokens(workspaceId: string, channel: Channel, tokens: { accessToken: string; refreshToken?: string; externalAccountId?: string }) {
        let conn = await this.connections.findForWorkspaceAndChannel(workspaceId, channel);
        if (!conn)
            conn = this.connections.create({
                workspace: { id: workspaceId },
                type: channel,
            });
        conn.accessToken = encryptSecret(tokens.accessToken);
        conn.refreshToken = tokens.refreshToken ? encryptSecret(tokens.refreshToken) : undefined;
        conn.externalAccountId = tokens.externalAccountId;
        conn.status = ConnectionStatus.Active;
        return this.connections.save(conn);
    }

    list(workspaceId: string) {
        return this.connections.listForWorkspace(workspaceId).then((cs) => cs.map((c) => ({ id: c.id, type: c.type, status: c.status })));
    }

    getActive(workspaceId: string, channel: Channel) {
        return this.connections.findActive(workspaceId, channel);
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
