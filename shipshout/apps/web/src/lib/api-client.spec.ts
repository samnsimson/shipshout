import { apiFetch } from './api-client';

describe('apiFetch', () => {
    it('sends credentials and prefixes API base', async () => {
        const spy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({}) } as any);
        process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
        await apiFetch('/workspaces');
        expect(spy).toHaveBeenCalledWith('http://api.test/api/workspaces', expect.objectContaining({ credentials: 'include' }));
        spy.mockRestore();
    });
});
