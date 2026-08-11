import { ConfigService } from '@nestjs/config';
import { EmailAdapter } from '../email/email-adapter';

const sendMock = jest.fn();

jest.mock('resend', () => ({
    Resend: jest.fn().mockImplementation(() => ({
        emails: { send: sendMock },
    })),
}));

function configService(values: Record<string, string | undefined>): ConfigService {
    return {
        get: (key: string) => values[key],
        getOrThrow: (key: string) => {
            const value = values[key];
            if (value === undefined) throw new Error(`Missing config: ${key}`);
            return value;
        },
    } as ConfigService;
}

describe('EmailAdapter', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('throws when RESEND_API_KEY is not configured', () => {
        expect(() => new EmailAdapter(configService({}))).toThrow('Missing config: RESEND_API_KEY');
    });

    it('sends via Resend when RESEND_API_KEY is set', async () => {
        sendMock.mockResolvedValue({ data: { id: '1' }, error: null });
        const adapter = new EmailAdapter(
            configService({
                RESEND_API_KEY: 're_test',
                EMAIL_FROM: 'Shipshout <noreply@example.com>',
            }),
        );

        await adapter.send({
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
});
