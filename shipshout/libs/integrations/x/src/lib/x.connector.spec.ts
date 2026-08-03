import { XConnector } from './x.connector.js';
import { Channel } from '@shipshout/database';

describe('XConnector', () => {
    it('posts a tweet and returns the url', async () => {
        const http = jest.fn(async () => ({
            ok: true,
            json: async () => ({ data: { id: '123' } }),
        }));
        const c = new XConnector(http as any);
        expect(c.channel).toBe(Channel.X);
        const out = await c.publish({ text: 'hi', accessToken: 'tok' });
        expect(out.externalUrl).toContain('123');
        expect(http).toHaveBeenCalledWith('https://api.twitter.com/2/tweets', expect.objectContaining({ method: 'POST' }));
    });
});
