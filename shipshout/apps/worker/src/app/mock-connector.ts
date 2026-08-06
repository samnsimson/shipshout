import { randomUUID } from 'crypto';
import { Channel } from '@shipshout/database';
import { ChannelConnector, PublishInput, PublishOutput } from '@shipshout/integrations-core';

export class MockConnector implements ChannelConnector {
    constructor(public channel: Channel) {}

    async publish(_input: PublishInput): Promise<PublishOutput> {
        return { externalUrl: `https://example.test/${this.channel}/${randomUUID()}` };
    }
}
