import { Channel } from '@shipshout/data-entities';

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
