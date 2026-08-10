/* eslint-disable @typescript-eslint/no-explicit-any */
import { DynamicModule, Global, Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { AuthModuleAsyncOptions } from './auth.options';
import { authOptionsSchema } from './contracts/schema/auth.schema';
import { AuthOptions } from './contracts/types/auth.types';
import { createAuth } from './auth.config';

@Global()
@Module({})
export class AuthModule {
    private static validateOptions(options: AuthOptions): AuthOptions {
        const result = authOptionsSchema.safeParse(options);
        if (!result.success) throw new Error(result.error.message);
        return result.data;
    }

    static forRootAsync(options: AuthModuleAsyncOptions): DynamicModule {
        return {
            global: true,
            module: AuthModule,
            imports: [
                BetterAuthModule.forRootAsync({
                    imports: options.imports,
                    inject: options.inject,
                    useFactory: async (...args: any[]) => {
                        const authOptions = await options.useFactory(...args);
                        const opts = this.validateOptions(authOptions);
                        return { auth: createAuth(opts) };
                    },
                }),
            ],
        };
    }
}
