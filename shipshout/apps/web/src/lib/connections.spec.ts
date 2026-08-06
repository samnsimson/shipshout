import { mockConnect, connectUrl } from './connections';

describe('connections lib', () => {
    beforeEach(() => {
        process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
    });

    it('POSTs a mock-connect request', async () => {
        const spy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ connected: true }) } as any);
        await mockConnect('w1', 'x');
        expect(spy).toHaveBeenCalledWith('http://api.test/api/workspaces/w1/connections/x/mock-connect', expect.objectContaining({ method: 'POST' }));
        spy.mockRestore();
    });

    it('builds the OAuth start URL', () => {
        expect(connectUrl('w1', 'x')).toBe('http://api.test/api/workspaces/w1/connections/x/start');
    });
});
