import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { NextFunction, Request, Response } from 'express';
import { Repository } from 'typeorm';
import { User } from '@shipshout/data-entities';

@Injectable()
export class SessionUserMiddleware implements NestMiddleware {
  constructor(@InjectRepository(User) private users: Repository<User>) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    if (req.session?.userId && !req.user) {
      req.user = (await this.users.findOne({ where: { id: req.session.userId } })) ?? undefined;
    }
    next();
  }
}
