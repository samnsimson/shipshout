import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { GlobalExceptionFilter } from '@shipshout/core';
import { Swagger } from '@shipshout/swagger';
import { AppModule } from './app/app.module';
import { LoggerModule } from '@shipshout/logger';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: LoggerModule.getLogger('shipshout-api-svc'),
        bodyParser: false,
    });

    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    const swaggerTitle = process.env.SWAGGER_TITLE || 'Shipshout API';
    const swaggerDescription = process.env.SWAGGER_DESCRIPTION || 'Shipshout HTTP API';
    const swaggerVersion = process.env.SWAGGER_VERSION || '0.0.1';
    const swaggerPath = process.env.SWAGGER_PATH || 'docs';
    Swagger.setup(app, { title: swaggerTitle, description: swaggerDescription, version: swaggerVersion, path: swaggerPath });

    const port = process.env.PORT || 8000;
    await app.listen(port, () => {
        Logger.log(`🚀 Application is running on: http://localhost:${port}`);
        Logger.log(`Swagger UI: http://localhost:${port}/${swaggerPath}`);
        Logger.log(`OpenAPI JSON: http://localhost:${port}/${swaggerPath}/openapi.json`);
    });
}

bootstrap();
