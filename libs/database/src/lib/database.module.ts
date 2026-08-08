import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModuleAsyncOptions } from './database-module.options';
import { ENTITIES } from './entities';

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
                        return {
                            ...connection,
                            type: 'postgres' as const,
                            entities: ENTITIES,
                            synchronize: false,
                        };
                    },
                }),
            ],
        };
    }
}
