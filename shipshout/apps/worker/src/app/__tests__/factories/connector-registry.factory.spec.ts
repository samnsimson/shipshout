import { Channel } from '@shipshout/database';
import { XConnector } from '@shipshout/integrations-x';
import { buildConnectorRegistry } from '../../factories/connector-registry.factory';

describe('buildConnectorRegistry', () => {
    it('wires real connectors for all channels', () => {
        const registry = buildConnectorRegistry();
        expect(registry.get(Channel.X)).toBeInstanceOf(XConnector);
        expect(registry.get(Channel.Email)).toBeDefined();
    });
});
