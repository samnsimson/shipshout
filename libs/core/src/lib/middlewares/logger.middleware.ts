import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { TRANSACTION_ID_HEADER } from '../constants/transaction-id';
import { RequestContext } from '../request-context';

export type RequestWithTransactionId = Request & { transactionId: string };

const MAX_TRANSACTION_ID_LENGTH = 128;

function resolveTransactionId(req: Request): string {
    const incoming = req.header(TRANSACTION_ID_HEADER)?.trim();
    if (!incoming || incoming.length > MAX_TRANSACTION_ID_LENGTH) return randomUUID();
    return incoming;
}

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger(LoggerMiddleware.name);

    use(req: Request, res: Response, next: NextFunction) {
        const transactionId = resolveTransactionId(req);

        req.headers[TRANSACTION_ID_HEADER] = transactionId;
        (req as RequestWithTransactionId).transactionId = transactionId;
        res.setHeader(TRANSACTION_ID_HEADER, transactionId);

        const path = req.originalUrl || req.url;

        RequestContext.run({ transactionId }, () => {
            this.logger.log(`→ ${req.method} ${path}`);

            res.on('finish', () => {
                this.logger.log(`← ${req.method} ${path} ${res.statusCode}`);
            });

            next();
        });
    }
}
