import { Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { TRANSACTION_ID_HEADER } from '../constants/transaction-id';
import { LoggerMiddleware, RequestWithTransactionId } from '../middlewares/logger.middleware';
import { RequestContext } from '../context/request-context';

function mockReq(headers: Record<string, string | undefined> = {}): Request {
    return {
        header: (name: string) => headers[name.toLowerCase()] ?? headers[name],
        headers: { ...headers },
        method: 'GET',
        originalUrl: '/health',
        url: '/health',
    } as unknown as Request;
}

function mockRes(): Response & { headers: Record<string, string> } {
    const headers: Record<string, string> = {};
    return {
        headers,
        setHeader: (name: string, value: string) => {
            headers[name.toLowerCase()] = value;
        },
        on: jest.fn(),
        statusCode: 200,
    } as unknown as Response & { headers: Record<string, string> };
}

describe('LoggerMiddleware', () => {
    const middleware = new LoggerMiddleware();

    beforeEach(() => {
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('generates a UUID when header is missing and enters ALS for next', () => {
        const req = mockReq();
        const res = mockRes();
        let idInsideNext: string | undefined;

        middleware.use(req, res, () => {
            idInsideNext = RequestContext.getTransactionId();
        });

        expect(idInsideNext).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        expect((req as RequestWithTransactionId).transactionId).toBe(idInsideNext);
        expect(res.headers[TRANSACTION_ID_HEADER]).toBe(idInsideNext);
        expect(Logger.prototype.log).toHaveBeenCalledWith(expect.stringMatching(/^→ GET /));
    });

    it('reuses a valid incoming header', () => {
        const req = mockReq({ [TRANSACTION_ID_HEADER]: '  client-id-1  ' });
        const res = mockRes();
        let idInsideNext: string | undefined;

        middleware.use(req, res, () => {
            idInsideNext = RequestContext.getTransactionId();
        });

        expect(idInsideNext).toBe('client-id-1');
        expect(res.headers[TRANSACTION_ID_HEADER]).toBe('client-id-1');
    });

    it('regenerates when header exceeds 128 characters', () => {
        const oversized = 'x'.repeat(129);
        const req = mockReq({ [TRANSACTION_ID_HEADER]: oversized });
        const res = mockRes();
        let idInsideNext: string | undefined;

        middleware.use(req, res, () => {
            idInsideNext = RequestContext.getTransactionId();
        });

        expect(idInsideNext).not.toBe(oversized);
        expect(idInsideNext).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('registers finish listener inside ALS so outbound log sees context', () => {
        const req = mockReq({ [TRANSACTION_ID_HEADER]: 'finish-id' });
        const res = mockRes();
        let finishHandler: (() => void) | undefined;
        (res.on as jest.Mock).mockImplementation((event: string, handler: () => void) => {
            if (event === 'finish') finishHandler = handler;
        });

        middleware.use(req, res, () => undefined);
        expect(finishHandler).toBeDefined();

        finishHandler!();
        expect(Logger.prototype.log).toHaveBeenCalledWith(expect.stringMatching(/^← GET /));
        expect(RequestContext.getTransactionId()).toBeUndefined();
    });
});
