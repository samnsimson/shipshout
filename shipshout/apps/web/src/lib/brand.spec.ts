import { saveBrand } from './brand';

it('PUTs brand profile', async () => {
  const spy = jest
    .spyOn(global, 'fetch' as any)
    .mockResolvedValue({ ok: true, json: async () => ({}) } as any);
  process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
  await saveBrand('w1', { tone: 'professional', emojiPolicy: true });
  expect(spy).toHaveBeenCalledWith(
    'http://api.test/api/workspaces/w1/brand',
    expect.objectContaining({ method: 'PUT' }),
  );
  spy.mockRestore();
});
