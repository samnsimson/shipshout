import { Channel } from '@shipshout/database';
import { XConnector } from '@shipshout/integrations-x';
import { buildConnectorRegistry } from './connector-registry.factory';

describe('buildConnectorRegistry', () => {
    it('wires mock connectors when mockChannels is true', async () => {
        const registry = buildConnectorRegistry(true);
        const out = await registry.get(Channel.X).publish({ text: 'hi', accessToken: 'tok' });
        expect(out.externalUrl).toContain('https://example.test/x/');
    });

    it('wires real connectors when mockChannels is false', () => {
        const registry = buildConnectorRegistry(false);
        expect(registry.get(Channel.X)).toBeInstanceOf(XConnector);
    });
});
