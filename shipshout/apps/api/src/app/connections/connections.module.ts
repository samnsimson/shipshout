import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../config/database.module';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';
import { ChannelConnectionRepository } from './channel-connection.repository';

@Module({
    imports: [DatabaseModule, AuthModule],
    controllers: [ConnectionsController],
    providers: [ChannelConnectionRepository, ConnectionsService],
})
export class ConnectionsModule {}
