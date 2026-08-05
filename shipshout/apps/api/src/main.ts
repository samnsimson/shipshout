import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import session from 'express-session';
import { initSentry, PinoLoggerService } from '@shipshout/observability';
import { AppModule } from './app/app.module';

async function bootstrap() {
    initSentry();
    const logger = new PinoLoggerService('api');
    const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true, logger });
    const globalPrefix = 'api';
    app.setGlobalPrefix(globalPrefix);
    app.enableCors({ origin: process.env.WEB_BASE_URL ?? 'http://localhost:4200', credentials: true });
    app.use(
        session({
            resave: false,
            secret: process.env.SESSION_SECRET ?? 'dev-session-secret',
            saveUninitialized: false,
            cookie: { httpOnly: true, sameSite: 'lax' },
        }),
    );
    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`Application is running on: http://localhost:${port}/${globalPrefix}`, 'Bootstrap');
}

bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
});
