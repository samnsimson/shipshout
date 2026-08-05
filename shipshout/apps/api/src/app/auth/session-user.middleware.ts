import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { UserRepository } from '@shipshout/auth';

@Injectable()
export class SessionUserMiddleware implements NestMiddleware {
    constructor(private users: UserRepository) {}

    async use(req: Request, _res: Response, next: NextFunction) {
        const e2eUserId = process.env.E2E_TEST_USER;
        if (e2eUserId && req.headers['x-e2e-user'] === e2eUserId) {
            req.user = (await this.users.findOneBy({ id: e2eUserId })) ?? undefined;
            return next();
        }
        const userId = req.session?.userId;
        if (userId) req.user = (await this.users.findOneBy({ id: userId })) ?? undefined;
        next();
    }
}
