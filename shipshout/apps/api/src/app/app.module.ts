import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { buildApiTypeOrmOptions } from './config/typeorm.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(buildApiTypeOrmOptions()),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
