import { connectGithubUrl, createRepository } from './repositories';

describe('repositories lib', () => {
    beforeEach(() => {
        process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
    });

    it('builds GitHub connect URL', () => {
        expect(connectGithubUrl('w1')).toBe('http://api.test/api/workspaces/w1/repositories/github/start');
    });

    it('POSTs a new repository', async () => {
        const spy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ webhookSecret: 's' }) } as any);
        await createRepository('w1', { provider: 'github', externalId: 'abc', name: 'acme/app' });
        expect(spy).toHaveBeenCalledWith('http://api.test/api/workspaces/w1/repositories', expect.objectContaining({ method: 'POST' }));
        spy.mockRestore();
    });
});
