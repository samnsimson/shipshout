import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SwaggerOptions } from './swagger.options';

export class Swagger {
    private static logger = new Logger(Swagger.name);

    static setup(app: INestApplication, options: SwaggerOptions) {
        this.logger.log(`Setting up Swagger for ${options.title} at ${options.path}`);
        const config = this.buildConfig(options);
        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup(options.path, app, document);
        this.logger.log(`Swagger is available at http://localhost:${process.env.PORT || 8000}/${options.path}`);
    }

    private static buildConfig(options: SwaggerOptions) {
        const config = new DocumentBuilder().setTitle(options.title).setDescription(options.description).setVersion(options.version).build();
        return config;
    }
}
