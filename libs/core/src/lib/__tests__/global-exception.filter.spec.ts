import { ArgumentsHost, BadRequestException, HttpException, HttpStatus, Logger, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';
import { HttpErrorResponse } from '../filters/http-error-response';
import { RequestContext } from '../request-context';

function createHost(path = '/auth/login'): { host: ArgumentsHost; status: jest.Mock; json: jest.Mock } {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status } as unknown as Response;
    const request = { url: path, method: 'POST' } as unknown as Request;
    const host = {
        switchToHttp: () => ({
            getResponse: () => response,
            getRequest: () => request,
        }),
    } as ArgumentsHost;
    return { host, status, json };
}

describe('GlobalExceptionFilter', () => {
    const filter = new GlobalExceptionFilter();

    beforeEach(() => {
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('maps HttpException with transactionId from RequestContext', () => {
        const { host, status, json } = createHost('/auth/login');

        RequestContext.run({ transactionId: 'tx-1' }, () => {
            filter.catch(new UnauthorizedException('Invalid credentials'), host);
        });

        expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
        const body = json.mock.calls[0][0] as HttpErrorResponse;
        expect(body).toEqual(
            expect.objectContaining({
                statusCode: 401,
                message: 'Invalid credentials',
                error: 'Unauthorized',
                transactionId: 'tx-1',
                path: '/auth/login',
            }),
        );
        expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('sets transactionId null when RequestContext is empty', () => {
        const { host, json } = createHost();
        filter.catch(new BadRequestException('bad'), host);
        expect((json.mock.calls[0][0] as HttpErrorResponse).transactionId).toBeNull();
    });

    it('preserves validation message arrays', () => {
        const { host, status, json } = createHost();
        const messages = ['login must be a string', 'password must be longer than or equal to 8 characters'];
        filter.catch(new BadRequestException({ message: messages, error: 'Bad Request', statusCode: 400 }), host);

        expect(status).toHaveBeenCalledWith(400);
        expect((json.mock.calls[0][0] as HttpErrorResponse).message).toEqual(messages);
        expect((json.mock.calls[0][0] as HttpErrorResponse).error).toBe('Bad Request');
    });

    it('maps unknown errors to generic 500 and logs the original error', () => {
        const { host, status, json } = createHost('/boom');
        const err = new Error('secret db failure');

        filter.catch(err, host);

        expect(status).toHaveBeenCalledWith(500);
        expect(json.mock.calls[0][0]).toEqual(
            expect.objectContaining({
                statusCode: 500,
                message: 'Internal server error',
                error: 'Internal Server Error',
                path: '/boom',
                transactionId: null,
            }),
        );
        expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('secret db failure'), expect.any(String));
    });

    it('logs HttpException 5xx with error level', () => {
        const { host } = createHost();
        filter.catch(new HttpException('upstream failed', HttpStatus.BAD_GATEWAY), host);
        expect(Logger.prototype.error).toHaveBeenCalled();
        expect(Logger.prototype.warn).not.toHaveBeenCalled();
    });
});
