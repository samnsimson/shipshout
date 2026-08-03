import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';
import { ChannelConnectionRepository } from './channel-connection.repository';

@Module({
    imports: [AuthModule],
    controllers: [ConnectionsController],
    providers: [ChannelConnectionRepository, ConnectionsService],
})
export class ConnectionsModule {}
