import { DynamicModule, Module } from '@nestjs/common';
import { ApiClientModuleOptions } from './api-client.options.js';

@Module({})
export class ApiClientModule {
    static forRootAsync(options: ApiClientModuleOptions): DynamicModule {
        return {
            global: true,
            module: ApiClientModule,
        };
    }
}
