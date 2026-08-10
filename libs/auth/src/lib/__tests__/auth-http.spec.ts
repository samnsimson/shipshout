jest.mock('better-auth/api', () => {
    class APIError extends Error {
        status: string;
        statusCode: number;
        body: { message?: string; code?: string };

        constructor(status: string, body: { message?: string; code?: string }) {
            super(body.message ?? status);
            this.status = status;
            this.body = body;
            this.statusCode = status === 'UNAUTHORIZED' ? 401 : status === 'CONFLICT' ? 409 : 400;
        }
    }

    return { APIError };
});

import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { APIError } from 'better-auth/api';
import { EmailAdapter } from '../email/email-adapter';
import { AuthUtils } from '../utils/auth-http';

describe('AuthUtils', () => {
    describe('applyAuthCookies', () => {
        it('appends every set-cookie header', () => {
            const appended: string[] = [];
            const res = {
                append: (_name: string, value: string) => {
                    appended.push(value);
                },
            };
            const headers = new Headers();
            headers.append('set-cookie', 'a=1; Path=/');
            headers.append('set-cookie', 'b=2; Path=/');

            AuthUtils.applyAuthCookies(res as never, headers);

            expect(appended).toEqual(['a=1; Path=/', 'b=2; Path=/']);
        });
    });

    describe('mapAuthError', () => {
        it('maps unauthorized API errors', () => {
            const error = new APIError('UNAUTHORIZED', { message: 'Invalid password', code: 'INVALID_PASSWORD' });
            expect(() => AuthUtils.mapAuthError(error)).toThrow(UnauthorizedException);
        });

        it('maps conflict-style API errors', () => {
            const error = new APIError('CONFLICT', { message: 'User already exists', code: 'USER_ALREADY_EXISTS' });
            expect(() => AuthUtils.mapAuthError(error)).toThrow(ConflictException);
        });

        it('maps other 4xx to BadRequest', () => {
            const error = new APIError('BAD_REQUEST', { message: 'bad', code: 'BAD' });
            expect(() => AuthUtils.mapAuthError(error)).toThrow(BadRequestException);
        });
    });

    describe('sendResetPasswordEmail', () => {
        it('sends reset email via the adapter', async () => {
            const send = jest.spyOn(EmailAdapter.prototype, 'send').mockResolvedValue(undefined);

            await AuthUtils.sendResetPasswordEmail({ email: 'ada@example.com' }, 'https://example.com/reset?token=abc');

            expect(send).toHaveBeenCalledWith({
                to: 'ada@example.com',
                subject: 'Reset your password',
                text: 'https://example.com/reset?token=abc',
                html: '<p>Reset your password:</p><p><a href="https://example.com/reset?token=abc">https://example.com/reset?token=abc</a></p>',
            });

            send.mockRestore();
        });
    });
});
