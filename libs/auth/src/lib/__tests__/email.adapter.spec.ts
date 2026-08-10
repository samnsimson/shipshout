import { Logger } from '@nestjs/common';
import { EmailAdapter } from '../email/email-adapter';

describe('EmailAdapter', () => {
    it('logs the outbound email payload', async () => {
        const adapter = new EmailAdapter();
        const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

        await adapter.send({
            to: 'user@example.com',
            subject: 'Reset password',
            text: 'https://example.com/reset?token=abc',
        });

        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('user@example.com'));
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Reset password'));
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('https://example.com/reset?token=abc'));

        logSpy.mockRestore();
    });
});
