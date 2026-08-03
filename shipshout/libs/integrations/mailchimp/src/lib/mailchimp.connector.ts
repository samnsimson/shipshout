import { Channel } from '@shipshout/data-entities';
import { ChannelConnector, PublishInput, PublishOutput } from '@shipshout/integrations-core';

type Http = typeof fetch;

export class MailchimpConnector implements ChannelConnector {
  channel = Channel.Mailchimp;

  constructor(
    private http: Http = fetch,
    private dc = process.env.MAILCHIMP_DC ?? 'us1',
    private listId = process.env.MAILCHIMP_LIST_ID ?? '',
  ) {}

  async publish({ text, accessToken }: PublishInput): Promise<PublishOutput> {
    const [subject, ...body] = text.split('\n');
    const res = await this.http(`https://${this.dc}.api.mailchimp.com/3.0/campaigns`, {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'regular',
        recipients: { list_id: this.listId },
        settings: {
          subject_line: subject,
          title: subject,
          from_name: 'ShipShout',
          reply_to: process.env.EMAIL_FROM ?? 'updates@shipshout.app',
        },
      }),
    });
    if (!res.ok) throw new Error(`Mailchimp create failed: ${res.status}`);
    void body;
    return {};
  }
}
