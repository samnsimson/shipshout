import { MailchimpConnector } from './mailchimp.connector';
import { Channel } from '@shipshout/database';

describe('MailchimpConnector', () => {
    it('creates a campaign', async () => {
        const http = jest.fn(async () => ({ ok: true, json: async () => ({ id: 'c1' }) }));
        const c = new MailchimpConnector(http as any, 'us1', 'list1');
        expect(c.channel).toBe(Channel.Mailchimp);
        await c.publish({ text: 'Subject\nBody', accessToken: 'tok' });
        expect(http).toHaveBeenCalledWith('https://us1.api.mailchimp.com/3.0/campaigns', expect.objectContaining({ method: 'POST' }));
    });
});
