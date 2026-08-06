import { apiFetch, ApiError } from './api-client';

describe('apiFetch', () => {
    it('sends credentials and prefixes API base', async () => {
        const spy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({}) } as any);
        process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
        await apiFetch('/workspaces');
        expect(spy).toHaveBeenCalledWith('http://api.test/api/workspaces', expect.objectContaining({ credentials: 'include' }));
        spy.mockRestore();
    });

    it('throws ApiError with status when response is not ok', async () => {
        const spy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: false, status: 403 } as any);
        await expect(apiFetch('/workspaces/ws-1')).rejects.toMatchObject({ status: 403, name: 'ApiError' });
        await expect(apiFetch('/workspaces/ws-1')).rejects.toBeInstanceOf(ApiError);
        spy.mockRestore();
    });
});
