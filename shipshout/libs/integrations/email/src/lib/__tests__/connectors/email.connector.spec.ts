import { EmailConnector } from '../../connectors/email.connector';

describe('EmailConnector', () => {
    it('sends via provider API', async () => {
        const http = jest.fn(async () => ({ ok: true, json: async () => ({ id: 'm1' }) }));
        const c = new EmailConnector(http as any);
        const out = await c.publish({ text: 'subject\nbody', accessToken: 'apikey' });
        expect(http).toHaveBeenCalled();
        expect(out.externalUrl).toBeUndefined();
    });
});
