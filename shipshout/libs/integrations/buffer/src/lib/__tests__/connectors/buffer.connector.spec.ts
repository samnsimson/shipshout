import { BufferConnector } from '../../connectors/buffer.connector';
import { Channel } from '@shipshout/database';

it('queues an update in Buffer', async () => {
    const http = jest.fn(async () => ({ ok: true, json: async () => ({ updates: [{ id: 'u1' }] }) }));
    const c = new BufferConnector(http as any, 'profile1');
    expect(c.channel).toBe(Channel.Buffer);
    await c.publish({ text: 'hi', accessToken: 'tok' });
    expect(http).toHaveBeenCalled();
});
