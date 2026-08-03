import { Channel } from '@shipshout/data-entities';
import { ChannelConnector, PublishInput, PublishOutput } from '@shipshout/integrations-core';

type Http = typeof fetch;

export class LinkedInConnector implements ChannelConnector {
  channel = Channel.LinkedIn;

  constructor(
    private http: Http = fetch,
    private authorUrn = process.env.LINKEDIN_AUTHOR_URN,
  ) {}

  async publish({ text, accessToken }: PublishInput): Promise<PublishOutput> {
    const res = await this.http('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: this.authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    });
    if (!res.ok) throw new Error(`LinkedIn publish failed: ${res.status}`);
    const id = res.headers.get('x-restli-id') ?? '';
    return { externalUrl: id ? `https://www.linkedin.com/feed/update/${id}` : undefined };
  }
}
