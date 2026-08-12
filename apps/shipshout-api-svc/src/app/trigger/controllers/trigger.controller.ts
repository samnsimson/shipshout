import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, JwtUser, type JwtUserPayload } from '@shipshout/auth/guard';
import { ApiResource } from '@shipshout/swagger';
import { LinkedRepositoryDetailResponseDto, RepositoryTriggersResponseDto, TriggerEventListResponseDto, UpdateRepositoryTriggersDto } from '../dto/trigger.dto';
import { TriggerEventService } from '../services/trigger-event.service';
import { TriggerService } from '../services/trigger.service';

@ApiTags('repositories')
@Controller('repositories')
export class TriggerController {
    constructor(
        private readonly triggerService: TriggerService,
        private readonly triggerEventService: TriggerEventService,
    ) {}

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiResource({
        operationId: 'getLinkedRepositoryDetail',
        status: 200,
        response: LinkedRepositoryDetailResponseDto,
        params: [{ name: 'id', description: 'Linked repository id' }],
        errors: [{ status: 404, description: 'Linked repository not found' }],
    })
    getLinkedRepositoryDetail(@JwtUser() user: JwtUserPayload, @Param('id') id: string): Promise<LinkedRepositoryDetailResponseDto> {
        return this.triggerService.getRepositoryDetail(user.sub, id);
    }

    @Get(':id/triggers')
    @UseGuards(JwtAuthGuard)
    @ApiResource({
        operationId: 'getRepositoryTriggers',
        status: 200,
        response: RepositoryTriggersResponseDto,
        params: [{ name: 'id', description: 'Linked repository id' }],
        errors: [{ status: 404, description: 'Linked repository not found' }],
    })
    getRepositoryTriggers(@JwtUser() user: JwtUserPayload, @Param('id') id: string): Promise<RepositoryTriggersResponseDto> {
        return this.triggerService.getTriggers(user.sub, id);
    }

    @Patch(':id/triggers')
    @UseGuards(JwtAuthGuard)
    @ApiResource({
        operationId: 'updateRepositoryTriggers',
        status: 200,
        response: RepositoryTriggersResponseDto,
        params: [{ name: 'id', description: 'Linked repository id' }],
        body: UpdateRepositoryTriggersDto,
        errors: [{ status: 404, description: 'Linked repository not found' }],
    })
    updateRepositoryTriggers(@JwtUser() user: JwtUserPayload, @Param('id') id: string, @Body() body: UpdateRepositoryTriggersDto): Promise<RepositoryTriggersResponseDto> {
        return this.triggerService.updateTriggers(user.sub, id, body);
    }

    @Get(':id/events')
    @UseGuards(JwtAuthGuard)
    @ApiResource({
        operationId: 'listRepositoryTriggerEvents',
        status: 200,
        response: TriggerEventListResponseDto,
        params: [{ name: 'id', description: 'Linked repository id' }],
        queries: [{ name: 'limit', required: false, type: Number }],
        errors: [{ status: 404, description: 'Linked repository not found' }],
    })
    listRepositoryTriggerEvents(@JwtUser() user: JwtUserPayload, @Param('id') id: string, @Query('limit') limit?: string): Promise<TriggerEventListResponseDto> {
        const parsedLimit = limit ? Number(limit) : 20;
        return this.triggerEventService.listRecent(user.sub, id, Number.isFinite(parsedLimit) ? parsedLimit : 20);
    }
}
