import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CoreModule, LoggerMiddleware } from '@shipshout/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '@shipshout/auth';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        AuthModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                databaseUrl: configService.getOrThrow<string>('DATABASE_URL'),
                secret: configService.getOrThrow<string>('BETTER_AUTH_SECRET'),
                baseUrl: configService.getOrThrow<string>('BETTER_AUTH_BASE_URL'),
                googleClientId: configService.get<string>('GOOGLE_CLIENT_ID'),
                googleClientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
                githubClientId: configService.get<string>('GITHUB_CLIENT_ID'),
                githubClientSecret: configService.get<string>('GITHUB_CLIENT_SECRET'),
            }),
        }),
        CoreModule,
        TerminusModule,
        HttpModule,
    ],
    controllers: [AppController, HealthController],
    providers: [AppService],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes('{*path}');
    }
}
