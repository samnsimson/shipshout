import { ConnectionsService } from '../../services/connections.service';
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

    it('validateResendKey succeeds for ok response', async () => {
        const svc = new ConnectionsService({} as any);
        global.fetch = jest.fn(async () => ({ ok: true })) as any;
        await expect(svc.validateResendKey('re_test')).resolves.toBeUndefined();
    });

    it('validateResendKey throws for non-ok response', async () => {
        const svc = new ConnectionsService({} as any);
        global.fetch = jest.fn(async () => ({ ok: false, status: 401 })) as any;
        await expect(svc.validateResendKey('bad')).rejects.toThrow('Invalid Resend API key');
    });

    it('oauthConfig reflects env var presence', () => {
        const savedXId = process.env.X_CLIENT_ID;
        const savedXSecret = process.env.X_CLIENT_SECRET;
        const savedLiId = process.env.LINKEDIN_CLIENT_ID;
        const savedLiSecret = process.env.LINKEDIN_CLIENT_SECRET;
        process.env.X_CLIENT_ID = 'id';
        process.env.X_CLIENT_SECRET = 'secret';
        delete process.env.LINKEDIN_CLIENT_ID;
        delete process.env.LINKEDIN_CLIENT_SECRET;
        const svc = new ConnectionsService({} as any);
        const cfg = svc.oauthConfig();
        expect(cfg.x).toBe(true);
        expect(cfg.linkedin).toBe(false);
        expect(cfg.email).toBe(true);
        if (savedXId === undefined) delete process.env.X_CLIENT_ID;
        else process.env.X_CLIENT_ID = savedXId;
        if (savedXSecret === undefined) delete process.env.X_CLIENT_SECRET;
        else process.env.X_CLIENT_SECRET = savedXSecret;
        if (savedLiId === undefined) delete process.env.LINKEDIN_CLIENT_ID;
        else process.env.LINKEDIN_CLIENT_ID = savedLiId;
        if (savedLiSecret === undefined) delete process.env.LINKEDIN_CLIENT_SECRET;
        else process.env.LINKEDIN_CLIENT_SECRET = savedLiSecret;
    });
});
