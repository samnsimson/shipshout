import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelConnection } from '@shipshout/data-entities';
import { AuthModule } from '../auth/auth.module';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChannelConnection]), AuthModule],
  controllers: [ConnectionsController],
  providers: [ConnectionsService],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}
