import { generateTweet } from './generator';

describe('generateTweet', () => {
    it('calls the public endpoint', async () => {
        const spy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ tweet: 'hi' }) } as any);
        process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
        const out = await generateTweet('notes');
        expect(out.tweet).toBe('hi');
        expect(spy).toHaveBeenCalledWith('http://api.test/api/public/tweet', expect.objectContaining({ method: 'POST' }));
        spy.mockRestore();
    });
});
