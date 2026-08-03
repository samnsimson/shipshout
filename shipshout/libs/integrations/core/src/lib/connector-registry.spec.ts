import { ConnectorRegistry } from './connector-registry.js';
import { Channel } from '@shipshout/data-entities';

describe('ConnectorRegistry', () => {
  it('returns a registered connector', () => {
    const fake = { channel: Channel.X, publish: jest.fn() } as any;
    const reg = new ConnectorRegistry([fake]);
    expect(reg.get(Channel.X)).toBe(fake);
  });

  it('throws for unregistered channel', () => {
    const reg = new ConnectorRegistry([]);
    expect(() => reg.get(Channel.LinkedIn)).toThrow();
  });
});
