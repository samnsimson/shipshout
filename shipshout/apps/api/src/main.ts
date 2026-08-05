/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import session from 'express-session';
import { initSentry, createLogger } from '@shipshout/observability';
import { AppModule } from './app/app.module';

async function bootstrap() {
    initSentry();
    const log = createLogger('api');
    const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true, logger: false });
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
    log.info(`Application is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
