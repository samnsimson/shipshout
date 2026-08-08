import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildTypeOrmOptions } from './build-typeorm-options';
import { DatabaseModuleAsyncOptions } from './database-module.options';

@Module({})
export class DatabaseModule {
    static forRootAsync(options: DatabaseModuleAsyncOptions): DynamicModule {
        return {
            global: true,
            module: DatabaseModule,
            imports: [
                TypeOrmModule.forRootAsync({
                    imports: options.imports,
                    inject: options.inject,
                    useFactory: async (...args: unknown[]) => {
                        const connection = await options.useFactory(...args);
                        return buildTypeOrmOptions(connection);
                    },
                }),
            ],
        };
    }
}
