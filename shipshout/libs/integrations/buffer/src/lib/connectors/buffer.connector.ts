import { Channel } from '@shipshout/database';
import { ChannelConnector, PublishInput, PublishOutput } from '@shipshout/integrations-core';

type Http = typeof fetch;

export class BufferConnector implements ChannelConnector {
    channel = Channel.Buffer;

    constructor(
        private http: Http = fetch,
        private profileId = process.env.BUFFER_PROFILE_ID ?? '',
    ) {}

    async publish({ text, accessToken }: PublishInput): Promise<PublishOutput> {
        const res = await this.http('https://api.bufferapp.com/1/updates/create.json', {
            method: 'POST',
            headers: {
                authorization: `Bearer ${accessToken}`,
                'content-type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ text, 'profile_ids[]': this.profileId }).toString(),
        });
        if (!res.ok) throw new Error(`Buffer publish failed: ${res.status}`);
        return {};
    }
}
