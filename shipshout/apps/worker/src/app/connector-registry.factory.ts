import { Channel } from '@shipshout/database';
import { ConnectorRegistry } from '@shipshout/integrations-core';
import { XConnector } from '@shipshout/integrations-x';
import { LinkedInConnector } from '@shipshout/integrations-linkedin';
import { EmailConnector } from '@shipshout/integrations-email';
import { BufferConnector } from '@shipshout/integrations-buffer';
import { MailchimpConnector } from '@shipshout/integrations-mailchimp';
import { MockConnector } from './mock-connector';

const MOCKABLE_CHANNELS = [Channel.X, Channel.LinkedIn, Channel.Email, Channel.Buffer, Channel.Mailchimp];

export function buildConnectorRegistry(mockChannels: boolean = process.env.MOCK_CHANNELS === 'true'): ConnectorRegistry {
    if (mockChannels) return new ConnectorRegistry(MOCKABLE_CHANNELS.map((channel) => new MockConnector(channel)));
    return new ConnectorRegistry([new XConnector(), new LinkedInConnector(), new EmailConnector(), new BufferConnector(), new MailchimpConnector()]);
}
