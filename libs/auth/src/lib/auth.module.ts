import { DynamicModule, Global, Module } from '@nestjs/common';
import { AuthModuleOptions } from './auth-module.options';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { betterAuth } from 'better-auth';
import { authOptionsSchema } from './contracts/schema/auth.schema';
import { AuthOptions } from './contracts/types/auth.types';

@Global()
@Module({})
export class AuthModule {
    private static validateOptions(options: AuthModuleOptions): AuthOptions {
        const result = authOptionsSchema.safeParse(options);
        if (!result.success) throw new Error(result.error.message);
        return result.data;
    }

    static forRootAsync(options: AuthModuleOptions): DynamicModule {
        return {
            global: true,
            module: AuthModule,
            imports: [
                BetterAuthModule.forRootAsync({
                    useFactory: async (...args: unknown[]) => {
                        const authOptions = await options.useFactory(...args);
                        const opts = this.validateOptions(authOptions);

                        return {
                            auth: betterAuth({
                                secret: opts.secret,
                                baseURL: opts.baseUrl,
                                emailAndPassword: { enabled: true },
                                socialProviders: {
                                    google: { clientId: opts.googleClientId ?? '', clientSecret: opts.googleClientSecret },
                                    github: { clientId: opts.githubClientId ?? '', clientSecret: opts.githubClientSecret },
                                },
                            }),
                        };
                    },
                }),
            ],
        };
    }
}
