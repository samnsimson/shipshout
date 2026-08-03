import { Channel } from '@shipshout/data-entities';
import { ChannelConnector } from './channel-connector.js';

export class ConnectorRegistry {
  private map = new Map<Channel, ChannelConnector>();

  constructor(connectors: ChannelConnector[]) {
    connectors.forEach((c) => this.map.set(c.channel, c));
  }

  get(channel: Channel): ChannelConnector {
    const c = this.map.get(channel);
    if (!c) throw new Error(`No connector registered for ${channel}`);
    return c;
  }
}
