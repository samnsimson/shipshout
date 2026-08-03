import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Draft } from '@shipshout/data-entities';
import { QueueModule } from '@shipshout/queue/module';
import { AuthModule } from '../auth/auth.module';
import { DraftsController } from './drafts.controller';
import { DraftsService } from './drafts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Draft]), AuthModule, QueueModule],
  controllers: [DraftsController],
  providers: [DraftsService],
})
export class DraftsModule {}
