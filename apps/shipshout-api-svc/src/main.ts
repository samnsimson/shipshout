/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Swagger } from '@shipshout/swagger';
import { AppModule } from './app/app.module';
import { LoggerModule } from '@shipshout/logger';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: LoggerModule.getLogger('shipshout-api-svc'),
    });
    const globalPrefix = 'api';
    app.setGlobalPrefix(globalPrefix);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    Swagger.setup(app, {
        title: 'Shipshout API',
        description: 'Shipshout HTTP API',
        version: '0.0.1',
        path: 'docs',
    });

    const port = process.env.PORT || 3000;
    await app.listen(port);
    Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
    Logger.log(`Swagger docs: http://localhost:${port}/${globalPrefix}/docs`);
}

bootstrap();
