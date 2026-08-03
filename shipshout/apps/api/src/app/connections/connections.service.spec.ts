import { ConnectionsService } from './connections.service';
import { Channel, ConnectionStatus } from '@shipshout/database';

process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');

describe('ConnectionsService', () => {
    it('stores encrypted tokens and returns decrypted access token', async () => {
        const store: any[] = [];
        const repo = {
            findForWorkspaceAndChannel: jest.fn(async (_ws: string, type: Channel) => store.find((c) => c.type === type)),
            findActive: jest.fn(async (_ws: string, type: Channel) => store.find((c) => c.type === type && c.status === ConnectionStatus.Active)),
            listForWorkspace: jest.fn(async () => store),
            create: (d: any) => d,
            save: jest.fn(async (d: any) => {
                const rec = { id: 'c1', ...d };
                store.push(rec);
                return rec;
            }),
        };
        const svc = new ConnectionsService(repo as any);
        await svc.saveTokens('w1', Channel.X, { accessToken: 'plain', refreshToken: 'r' });
        expect(store[0].accessToken).not.toBe('plain');
        const tok = await svc.getActiveAccessToken('w1', Channel.X);
        expect(tok).toBe('plain');
    });
});
