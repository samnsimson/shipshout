import { Logger } from '@nestjs/common';

const sendMock = jest.fn();

jest.mock('resend', () => ({
    Resend: jest.fn().mockImplementation(() => ({
        emails: { send: sendMock },
    })),
}));

describe('EmailAdapter', () => {
    const originalKey = process.env.RESEND_API_KEY;
    const originalFrom = process.env.EMAIL_FROM;

    afterEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        if (originalKey === undefined) delete process.env.RESEND_API_KEY;
        else process.env.RESEND_API_KEY = originalKey;
        if (originalFrom === undefined) delete process.env.EMAIL_FROM;
        else process.env.EMAIL_FROM = originalFrom;
    });

    it('logs the outbound email payload when Resend is not configured', async () => {
        delete process.env.RESEND_API_KEY;
        const { EmailAdapter } = await import('../email/email-adapter');
        const adapter = new EmailAdapter();
        const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

        await adapter.send({
            to: 'user@example.com',
            subject: 'Reset password',
            text: 'https://example.com/reset?token=abc',
        });

        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('user@example.com'));
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Reset password'));
        expect(sendMock).not.toHaveBeenCalled();
        logSpy.mockRestore();
    });

    it('sends via Resend when RESEND_API_KEY is set', async () => {
        process.env.RESEND_API_KEY = 're_test';
        process.env.EMAIL_FROM = 'Shipshout <noreply@example.com>';
        sendMock.mockResolvedValue({ data: { id: '1' }, error: null });
        const { EmailAdapter } = await import('../email/email-adapter');
        const adapter = new EmailAdapter();

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
