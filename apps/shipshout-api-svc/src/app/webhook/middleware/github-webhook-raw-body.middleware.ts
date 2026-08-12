import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import express from 'express';

@Injectable()
export class GithubWebhookRawBodyMiddleware implements NestMiddleware {
    private readonly parser = express.raw({ type: 'application/json' });

    use(req: Request, res: Response, next: NextFunction): void {
        this.parser(req, res, next);
    }
}
