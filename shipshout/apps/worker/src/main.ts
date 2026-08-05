import { NestFactory } from '@nestjs/core';
import { createLogger, initSentry } from '@shipshout/observability';
import { AppModule } from './app/app.module';

async function bootstrap() {
    initSentry();
    const log = createLogger('worker');
    await NestFactory.createApplicationContext(AppModule);
    log.info('ShipShout worker started');
}

bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
});
