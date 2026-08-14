import { LinkedInConnector } from '../../connectors/linkedin.connector';
import { Channel } from '@shipshout/database';

describe('LinkedInConnector', () => {
    it('posts and returns the url when restli id is present', async () => {
        const http = jest.fn(async () => ({
            ok: true,
            headers: { get: () => 'urn:li:share:1' },
        }));
        const c = new LinkedInConnector(http as any, 'urn:li:person:1');
        expect(c.channel).toBe(Channel.LinkedIn);
        const out = await c.publish({ text: 'hi', accessToken: 'tok' });
        expect(out.externalUrl).toContain('urn:li:share:1');
        expect(http).toHaveBeenCalledWith('https://api.linkedin.com/v2/ugcPosts', expect.objectContaining({ method: 'POST' }));
    });
});
