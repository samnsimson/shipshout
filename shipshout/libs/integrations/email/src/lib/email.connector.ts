import { Channel } from '@shipshout/data-entities';
import { ChannelConnector, PublishInput, PublishOutput } from '@shipshout/integrations-core';

type Http = typeof fetch;

export class EmailConnector implements ChannelConnector {
  channel = Channel.Email;

  constructor(private http: Http = fetch) {}

  async publish({ text, accessToken }: PublishInput): Promise<PublishOutput> {
    const [subject, ...bodyLines] = text.split('\n');
    const res = await this.http('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'updates@shipshout.app',
        to: process.env.EMAIL_TEST_TO ?? 'list@shipshout.app',
        subject: subject || 'Product update',
        text: bodyLines.join('\n'),
      }),
    });
    if (!res.ok) throw new Error(`Email send failed: ${res.status}`);
    return {};
  }
}
