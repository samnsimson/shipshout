import { ConnectorRegistry } from '@shipshout/integrations-core';
import { XConnector } from '@shipshout/integrations-x';
import { LinkedInConnector } from '@shipshout/integrations-linkedin';
import { EmailConnector } from '@shipshout/integrations-email';
import { BufferConnector } from '@shipshout/integrations-buffer';
import { MailchimpConnector } from '@shipshout/integrations-mailchimp';

export function buildConnectorRegistry(): ConnectorRegistry {
    return new ConnectorRegistry([
        new XConnector(),
        new LinkedInConnector(),
        new EmailConnector(),
        new BufferConnector(),
        new MailchimpConnector(),
    ]);
}
