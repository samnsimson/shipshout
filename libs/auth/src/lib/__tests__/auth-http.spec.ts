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
import { applyAuthCookies, mapAuthError } from '../utils/auth-http';

describe('auth-http helpers', () => {
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

            applyAuthCookies(res as never, headers);

            expect(appended).toEqual(['a=1; Path=/', 'b=2; Path=/']);
        });
    });

    describe('mapAuthError', () => {
        it('maps unauthorized API errors', () => {
            const error = new APIError('UNAUTHORIZED', { message: 'Invalid password', code: 'INVALID_PASSWORD' });
            expect(() => mapAuthError(error)).toThrow(UnauthorizedException);
        });

        it('maps conflict-style API errors', () => {
            const error = new APIError('CONFLICT', { message: 'User already exists', code: 'USER_ALREADY_EXISTS' });
            expect(() => mapAuthError(error)).toThrow(ConflictException);
        });

        it('maps other 4xx to BadRequest', () => {
            const error = new APIError('BAD_REQUEST', { message: 'bad', code: 'BAD' });
            expect(() => mapAuthError(error)).toThrow(BadRequestException);
        });
    });
});
