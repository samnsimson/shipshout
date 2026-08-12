import { forwardRef, Module } from '@nestjs/common';
import { RepositoryModule } from '../repository/repository.module';
import { ShoutoutModule } from '../shoutout/shoutout.module';
import { ChannelController } from './channel.controller';
import { ChannelTypeRepository } from './repositories/channel-type.repository';
import { RepositoryChannelRepository } from './repositories/repository-channel.repository';
import { ChannelCatalogService } from './services/channel-catalog.service';
import { RepositoryChannelService } from './services/repository-channel.service';

@Module({
    imports: [RepositoryModule, forwardRef(() => ShoutoutModule)],
    controllers: [ChannelController],
    providers: [ChannelTypeRepository, RepositoryChannelRepository, ChannelCatalogService, RepositoryChannelService],
    exports: [RepositoryChannelService, RepositoryChannelRepository],
})
export class ChannelModule {}
