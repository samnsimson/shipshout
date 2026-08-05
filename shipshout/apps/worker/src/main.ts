import { NestFactory } from '@nestjs/core';
import { initSentry, PinoLoggerService } from '@shipshout/observability';
import { AppModule } from './app/app.module';

async function bootstrap() {
    initSentry();
    const logger = new PinoLoggerService('worker');
    await NestFactory.createApplicationContext(AppModule, { logger });
    logger.log('ShipShout worker started', 'Bootstrap');
}

bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
});
