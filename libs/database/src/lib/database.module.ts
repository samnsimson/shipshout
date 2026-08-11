import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildTypeOrmOptions } from './build-typeorm-options';
import { DatabaseModuleAsyncOptions } from './database-module.options';
import { DataSource } from 'typeorm';

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
                        return { ...buildTypeOrmOptions(connection), autoLoadEntities: true };
                    },
                    dataSourceFactory: async (options) => {
                        if (!options) throw new Error('DataSourceOptions are required');
                        const dataSource = new DataSource(options);
                        await dataSource.initialize();
                        return dataSource;
                    },
                }),
            ],
        };
    }
}
