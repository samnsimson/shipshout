import { createWorkspace } from './workspaces';

describe('createWorkspace', () => {
    it('POSTs a new workspace', async () => {
        const spy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ id: 'w1' }) } as any);
        process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
        await createWorkspace('Acme');
        expect(spy).toHaveBeenCalledWith('http://api.test/api/workspaces', expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Acme' }) }));
        spy.mockRestore();
    });
});
