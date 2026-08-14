import { startCheckout } from './billing';

describe('startCheckout', () => {
    it('POSTs checkout and returns url', async () => {
        jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ url: 'https://checkout' }) } as any);
        process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
        const out = await startCheckout('w1', 'pro');
        expect(out.url).toBe('https://checkout');
    });
});
