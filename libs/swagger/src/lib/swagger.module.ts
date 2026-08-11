import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SwaggerOptions } from './swagger.options';

export class Swagger {
    private static logger = new Logger(Swagger.name);

    static setup(app: INestApplication, options: SwaggerOptions) {
        this.logger.log(`Setting up Swagger for ${options.title} at ${options.path}`);
        const config = this.buildConfig(options);
        const document = SwaggerModule.createDocument(app, config);
        const jsonDocumentUrl = `${options.path}/openapi.json`;
        SwaggerModule.setup(options.path, app, document, { jsonDocumentUrl });
        const port = process.env.PORT || 8000;
        this.logger.log(`Swagger UI: http://localhost:${port}/${options.path}`);
        this.logger.log(`OpenAPI JSON: http://localhost:${port}/${jsonDocumentUrl}`);
    }

    private static buildConfig(options: SwaggerOptions) {
        const config = new DocumentBuilder().setTitle(options.title).setDescription(options.description).setVersion(options.version).build();
        return config;
    }
}
