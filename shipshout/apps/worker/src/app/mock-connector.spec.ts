import { Channel } from '@shipshout/database';
import { MockConnector } from './mock-connector';

describe('MockConnector', () => {
    it('always resolves with a fake url for the given channel', async () => {
        const connector = new MockConnector(Channel.X);
        expect(connector.channel).toBe(Channel.X);
        const out = await connector.publish({ text: 'hello', accessToken: 'tok' });
        expect(out.externalUrl).toContain('https://example.test/x/');
    });
});
