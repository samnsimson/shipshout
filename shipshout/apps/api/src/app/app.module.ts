import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@shipshout/data-entities';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { SessionUserMiddleware } from './auth/session-user.middleware';
import { buildApiTypeOrmOptions } from './config/typeorm.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { QueueModule } from '@shipshout/queue/module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(buildApiTypeOrmOptions()),
    TypeOrmModule.forFeature([User]),
    QueueModule,
    AuthModule,
    WorkspacesModule,
    RepositoriesModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionUserMiddleware).forRoutes('*');
  }
}
