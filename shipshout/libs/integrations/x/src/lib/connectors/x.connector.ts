import { Channel } from '@shipshout/database';
import { ChannelConnector, PublishInput, PublishOutput } from '@shipshout/integrations-core';

type Http = typeof fetch;

export class XConnector implements ChannelConnector {
    channel = Channel.X;

    constructor(private http: Http = fetch) {}

    async publish({ text, accessToken }: PublishInput): Promise<PublishOutput> {
        const res = await this.http('https://api.twitter.com/2/tweets', {
            method: 'POST',
            headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error(`X publish failed: ${res.status}`);
        const data = (await res.json()) as { data: { id: string } };
        return { externalUrl: `https://x.com/i/web/status/${data.data.id}` };
    }
}
