import { EmailClient } from './email-client.js';

const sendMock = jest.fn();

jest.mock('resend', () => ({
    Resend: jest.fn().mockImplementation(() => ({
        emails: { send: sendMock },
    })),
}));

describe('EmailClient', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('sends via Resend with the configured from address', async () => {
        sendMock.mockResolvedValue({ data: { id: '1' }, error: null });
        const client = new EmailClient('re_test', 'Shipshout <noreply@example.com>');

        await client.send({
            to: 'user@example.com',
            subject: 'Verify your email',
            text: 'https://example.com/verify',
            html: '<p>Verify</p>',
        });

        expect(sendMock).toHaveBeenCalledWith({
            from: 'Shipshout <noreply@example.com>',
            to: 'user@example.com',
            subject: 'Verify your email',
            text: 'https://example.com/verify',
            html: '<p>Verify</p>',
        });
    });

    it('throws when Resend returns an error', async () => {
        sendMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
        const client = new EmailClient('re_test');

        await expect(client.send({ to: 'user@example.com', subject: 'Hi', text: 'Hi' })).rejects.toThrow('boom');
    });
});
