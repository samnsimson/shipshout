import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CoreModule, LoggerMiddleware } from '@shipshout/core';
import { DatabaseModule } from '@shipshout/database';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '@shipshout/auth';
import { RepositoryModule } from './repository/repository.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { PaymentsModule } from './payments/payments.module';
import { createGetSubscriptionPlans } from './subscription/get-subscription-plans';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                url: configService.getOrThrow<string>('DATABASE_URL'),
            }),
        }),
        AuthModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const databaseUrl = configService.getOrThrow<string>('DATABASE_URL');
                return {
                    databaseUrl,
                    secret: configService.getOrThrow<string>('BETTER_AUTH_SECRET'),
                    baseUrl: configService.getOrThrow<string>('BETTER_AUTH_BASE_URL'),
                    clientAppUrl: configService.getOrThrow<string>('CLIENT_APP_URL'),
                    cookieDomain: configService.get<string>('AUTH_COOKIE_DOMAIN'),
                    googleClientId: configService.get<string>('GOOGLE_CLIENT_ID'),
                    googleClientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
                    githubClientId: configService.get<string>('GITHUB_CLIENT_ID'),
                    githubClientSecret: configService.get<string>('GITHUB_CLIENT_SECRET'),
                    stripeSecretKey: configService.get<string>('STRIPE_SECRET_KEY'),
                    stripeWebhookSecret: configService.get<string>('STRIPE_WEBHOOK_SECRET'),
                    getSubscriptionPlans: createGetSubscriptionPlans(databaseUrl),
                };
            },
        }),
        CoreModule,
        TerminusModule,
        HttpModule,
        RepositoryModule,
        SubscriptionModule,
        PaymentsModule,
    ],
    controllers: [AppController, HealthController],
    providers: [AppService],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes('{*path}');
    }
}
