/* eslint-disable @typescript-eslint/no-explicit-any */
import { DynamicModule, Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { AuthModuleAsyncOptions } from './auth.options';
import { authOptionsSchema } from './contracts/schema/auth.schema';
import { AuthOptions } from './contracts/types/auth.types';
import { createAuth } from './auth.config';
import { AuthController } from './controllers/auth.controller';
import { EMAIL_ADAPTER } from './email/email-adapter';
import { LoggingEmailAdapter } from './email/logging-email.adapter';

@Module({})
export class AuthModule {
    private static validateOptions(options: AuthOptions): AuthOptions {
        const result = authOptionsSchema.safeParse(options);
        if (!result.success) throw new Error(result.error.message);
        return result.data;
    }

    static forRootAsync(options: AuthModuleAsyncOptions): DynamicModule {
        const emailAdapter = options.emailAdapter ?? new LoggingEmailAdapter();

        return {
            global: true,
            module: AuthModule,
            controllers: [AuthController],
            providers: [{ provide: EMAIL_ADAPTER, useValue: emailAdapter }],
            exports: [EMAIL_ADAPTER],
            imports: [
                BetterAuthModule.forRootAsync({
                    imports: options.imports,
                    inject: options.inject,
                    useFactory: async (...args: any[]) => {
                        const authOptions = await options.useFactory(...args);
                        const opts = this.validateOptions(authOptions);
                        return { auth: createAuth(opts, emailAdapter) };
                    },
                }),
            ],
        };
    }
}
