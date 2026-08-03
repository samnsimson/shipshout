import { updateDraft } from './drafts';

describe('updateDraft', () => {
  it('PATCHes edited copy', async () => {
    const spy = jest
      .spyOn(global, 'fetch' as any)
      .mockResolvedValue({ ok: true, json: async () => ({ id: 'd1' }) } as any);
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
    await updateDraft('w1', 'd1', 'hello');
    expect(spy).toHaveBeenCalledWith(
      'http://api.test/api/workspaces/w1/drafts/d1',
      expect.objectContaining({ method: 'PATCH' }),
    );
    spy.mockRestore();
  });
});
