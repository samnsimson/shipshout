import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, JwtUser, type JwtUserPayload } from '@shipshout/auth/guard';
import { ApiResource } from '@shipshout/swagger';
import { ChannelCatalogListResponseDto, PatchRepositoryChannelsDto, RepositoryChannelListResponseDto } from './dto/channel.dto';
import { ChannelCatalogService } from './services/channel-catalog.service';
import { RepositoryChannelService } from './services/repository-channel.service';

@ApiTags('channels')
@Controller()
export class ChannelController {
    constructor(
        private readonly channelCatalogService: ChannelCatalogService,
        private readonly repositoryChannelService: RepositoryChannelService,
    ) {}

    @Get('channels')
    @UseGuards(JwtAuthGuard)
    @ApiResource({ operationId: 'listChannels', status: 200, response: ChannelCatalogListResponseDto })
    listCatalog(@JwtUser() user: JwtUserPayload): Promise<ChannelCatalogListResponseDto> {
        return this.channelCatalogService.listForUser(user.sub);
    }

    @Get('repositories/:id/channels')
    @UseGuards(JwtAuthGuard)
    @ApiResource({
        operationId: 'listRepositoryChannels',
        status: 200,
        response: RepositoryChannelListResponseDto,
        params: [{ name: 'id', description: 'Linked repository id' }],
        errors: [{ status: 404, description: 'Linked repository not found' }],
    })
    listRepoChannels(@JwtUser() user: JwtUserPayload, @Param('id') id: string): Promise<RepositoryChannelListResponseDto> {
        return this.repositoryChannelService.listForRepo(user.sub, id);
    }

    @Patch('repositories/:id/channels')
    @UseGuards(JwtAuthGuard)
    @ApiResource({
        operationId: 'updateRepositoryChannels',
        status: 200,
        response: RepositoryChannelListResponseDto,
        params: [{ name: 'id', description: 'Linked repository id' }],
        body: PatchRepositoryChannelsDto,
        errors: [
            { status: 404, description: 'Linked repository not found' },
            { status: 403, description: 'Channel not available on plan' },
        ],
    })
    updateRepoChannels(@JwtUser() user: JwtUserPayload, @Param('id') id: string, @Body() body: PatchRepositoryChannelsDto): Promise<RepositoryChannelListResponseDto> {
        return this.repositoryChannelService.updateForRepo(user.sub, id, body);
    }
}
