import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { TRANSACTION_ID_HEADER } from '../constants/transaction-id';

export type RequestWithTransactionId = Request & { transactionId: string };

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger(LoggerMiddleware.name);

    use(req: Request, res: Response, next: NextFunction) {
        const incoming = req.header(TRANSACTION_ID_HEADER)?.trim();
        const transactionId = incoming || randomUUID();

        req.headers[TRANSACTION_ID_HEADER] = transactionId;
        (req as RequestWithTransactionId).transactionId = transactionId;
        res.setHeader(TRANSACTION_ID_HEADER, transactionId);

        const path = req.originalUrl || req.url;
        this.logger.log(`[${transactionId}] → ${req.method} ${path}`);

        res.on('finish', () => {
            this.logger.log(`[${transactionId}] ← ${req.method} ${path} ${res.statusCode}`);
        });

        next();
    }
}
