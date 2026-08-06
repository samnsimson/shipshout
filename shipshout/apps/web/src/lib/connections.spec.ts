import { connectEmail, connectUrl, connectionsConfig } from './connections';

describe('connections lib', () => {
    beforeEach(() => {
        process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
    });

    it('POSTs email connect', async () => {
        const spy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ connected: true }) } as any);
        await connectEmail('w1', 're_key');
        expect(spy).toHaveBeenCalledWith(
            'http://api.test/api/workspaces/w1/connections/email/connect',
            expect.objectContaining({ method: 'POST' }),
        );
        spy.mockRestore();
    });

    it('GETs connections config', async () => {
        const spy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ x: true }) } as any);
        await connectionsConfig('w1');
        expect(spy).toHaveBeenCalledWith('http://api.test/api/workspaces/w1/connections/config', expect.any(Object));
        spy.mockRestore();
    });

    it('builds the OAuth start URL', () => {
        expect(connectUrl('w1', 'x')).toBe('http://api.test/api/workspaces/w1/connections/x/start');
    });
});
