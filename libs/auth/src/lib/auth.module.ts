/* eslint-disable @typescript-eslint/no-explicit-any */
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { AUTH_OPTIONS } from './auth-options.token';
import { AuthModuleAsyncOptions } from './auth.options';
import { authOptionsSchema } from './contracts/schema/auth.schema';
import { AuthOptions } from './contracts/types/auth.types';
import { createAuth } from './auth.config';
import { AuthController } from './controllers/auth.controller';
import { AuthEmailBootstrap } from './email/auth-email.bootstrap';
import { EMAIL_ADAPTER, EmailAdapter } from './email/email-adapter';
import { AuthService } from './services/auth.service';

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
            controllers: [AuthController],
            providers: [
                EmailAdapter,
                { provide: EMAIL_ADAPTER, useExisting: EmailAdapter },
                AuthEmailBootstrap,
                {
                    provide: AUTH_OPTIONS,
                    inject: options.inject ?? [],
                    useFactory: async (...args: any[]) => this.validateOptions(await options.useFactory(...args)),
                },
                AuthService,
            ],
            exports: [EMAIL_ADAPTER, EmailAdapter, AuthService, AUTH_OPTIONS],
            imports: [
                ConfigModule,
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
