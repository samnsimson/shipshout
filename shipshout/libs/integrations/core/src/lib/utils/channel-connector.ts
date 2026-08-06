import { Channel } from '@shipshout/database';

export interface PublishInput {
    text: string;
    accessToken: string;
}

export interface PublishOutput {
    externalUrl?: string;
}

export interface ChannelConnector {
    channel: Channel;
    publish(input: PublishInput): Promise<PublishOutput>;
}
