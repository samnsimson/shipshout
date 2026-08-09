import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CoreModule, LoggerMiddleware } from '@shipshout/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [ConfigModule.forRoot({ isGlobal: true }), CoreModule, TerminusModule, HttpModule],
    controllers: [AppController, HealthController],
    providers: [AppService],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes('{*path}');
    }
}
