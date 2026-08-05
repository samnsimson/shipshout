/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import session from 'express-session';
import { AppModule } from './app/app.module';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
    const globalPrefix = 'api';
    app.setGlobalPrefix(globalPrefix);
    app.enableCors({
        origin: process.env.WEB_BASE_URL ?? 'http://localhost:4200',
        credentials: true,
    });
    app.use(
        session({
            secret: process.env.SESSION_SECRET ?? 'dev-session-secret',
            resave: false,
            saveUninitialized: false,
            cookie: { httpOnly: true, sameSite: 'lax' },
        }),
    );
    const port = process.env.PORT || 3000;
    await app.listen(port);
    Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
