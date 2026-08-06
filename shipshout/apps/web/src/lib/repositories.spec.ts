import { createRepository, simulateRelease } from './repositories';

describe('repositories lib', () => {
    beforeEach(() => {
        process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
    });

    it('POSTs a new repository', async () => {
        const spy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ webhookSecret: 's' }) } as any);
        await createRepository('w1', { provider: 'github', externalId: 'abc', name: 'acme/app' });
        expect(spy).toHaveBeenCalledWith('http://api.test/api/workspaces/w1/repositories', expect.objectContaining({ method: 'POST' }));
        spy.mockRestore();
    });

    it('POSTs a simulate-release request', async () => {
        const spy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ accepted: true }) } as any);
        await simulateRelease('w1', 'r1', { title: 'v1' });
        expect(spy).toHaveBeenCalledWith('http://api.test/api/workspaces/w1/repositories/r1/simulate-release', expect.objectContaining({ method: 'POST' }));
        spy.mockRestore();
    });
});
