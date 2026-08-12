/* eslint-disable @typescript-eslint/no-explicit-any */
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { AuthModuleAsyncOptions } from './auth.options';
import { authOptionsSchema } from './contracts/schema/auth.schema';
import { AuthOptions } from './contracts/types/auth.types';
import { createAuth } from './auth.config';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { AUTH_OPTIONS } from './constants/auth.constants';

@Module({})
export class AuthModule {
    private static validateOptions(options: AuthOptions): AuthOptions {
        const result = authOptionsSchema.safeParse(options);
        if (!result.success) throw new Error(result.error.message);
        return result.data;
    }

    private static authOptionsProvider(options: AuthModuleAsyncOptions): Provider<AuthOptions> {
        return {
            provide: AUTH_OPTIONS,
            inject: options.inject ?? [],
            useFactory: async (...args: any[]) => {
                const authOptions = await options.useFactory(...args);
                return this.validateOptions(authOptions);
            },
        };
    }

    static forRootAsync(options: AuthModuleAsyncOptions): DynamicModule {
        const AuthOptionsProvider = this.authOptionsProvider(options);

        return {
            global: true,
            module: AuthModule,
            controllers: [AuthController],
            providers: [AuthOptionsProvider, AuthService],
            exports: [AuthService, AUTH_OPTIONS],
            imports: [
                ...(options.imports ?? []),
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
