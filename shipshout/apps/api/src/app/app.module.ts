import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.service';
import { AuthModule } from './auth/auth.module';
import { SessionUserMiddleware } from './auth/middleware/session-user.middleware';
import { buildApiTypeOrmOptions } from './config/typeorm.module';
import { DatabaseModule } from './config/database.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { DraftsModule } from './drafts/drafts.module';
import { BrandModule } from './brand/brand.module';
import { ConnectionsModule } from './connections/connections.module';
import { BillingModule } from './billing/billing.module';
import { HealthModule } from './health/health.module';
import { PublicModule } from './public/public.module';
import { QueueModule } from '@shipshout/queue/module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot(buildApiTypeOrmOptions()),
        DatabaseModule,
        QueueModule,
        AuthModule,
        WorkspacesModule,
        RepositoriesModule,
        WebhooksModule,
        DraftsModule,
        BrandModule,
        ConnectionsModule,
        BillingModule,
        PublicModule,
        HealthModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(SessionUserMiddleware).forRoutes('*');
    }
}
