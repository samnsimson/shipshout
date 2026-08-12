import { Body, Controller, Get, MessageEvent, Param, Patch, Post, Sse, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, JwtUser, type JwtUserPayload } from '@shipshout/auth/guard';
import { ApiResource } from '@shipshout/swagger';
import { Observable } from 'rxjs';
import { ShoutoutDetailResponseDto, ShoutoutListResponseDto, ShoutoutStatusResponseDto } from '../dto/shoutout.dto';
import { UpdateShoutoutDraftDto } from '../dto/update-shoutout-draft.dto';
import { ShoutoutService } from '../services/shoutout.service';

@ApiTags('shoutouts')
@Controller('shoutouts')
export class ShoutoutController {
    constructor(private readonly shoutoutService: ShoutoutService) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiResource({ operationId: 'listShoutouts', status: 200, response: ShoutoutListResponseDto })
    listShoutouts(@JwtUser() user: JwtUserPayload): Promise<ShoutoutListResponseDto> {
        return this.shoutoutService.listForUser(user.sub);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiResource({
        operationId: 'getShoutout',
        status: 200,
        response: ShoutoutDetailResponseDto,
        params: [{ name: 'id', description: 'Shoutout id' }],
        errors: [{ status: 404, description: 'Shoutout not found' }],
    })
    getShoutout(@JwtUser() user: JwtUserPayload, @Param('id') id: string): Promise<ShoutoutDetailResponseDto> {
        return this.shoutoutService.getById(user.sub, id);
    }

    @Get(':id/events')
    @UseGuards(JwtAuthGuard)
    @Sse()
    streamEvents(@JwtUser() user: JwtUserPayload, @Param('id') id: string): Observable<MessageEvent> {
        return this.shoutoutService.streamEvents(user.sub, id);
    }

    @Patch(':id/drafts/:channelKey')
    @UseGuards(JwtAuthGuard)
    @ApiResource({
        operationId: 'updateShoutoutDraft',
        status: 200,
        response: ShoutoutDetailResponseDto,
        params: [
            { name: 'id', description: 'Shoutout id' },
            { name: 'channelKey', description: 'Channel key' },
        ],
        body: UpdateShoutoutDraftDto,
        errors: [
            { status: 404, description: 'Shoutout or draft not found' },
            { status: 409, description: 'Shoutout is not ready for review' },
        ],
    })
    updateDraft(
        @JwtUser() user: JwtUserPayload,
        @Param('id') id: string,
        @Param('channelKey') channelKey: string,
        @Body() body: UpdateShoutoutDraftDto,
    ): Promise<ShoutoutDetailResponseDto> {
        return this.shoutoutService.updateDraft(user.sub, id, channelKey, body);
    }

    @Post(':id/publish')
    @UseGuards(JwtAuthGuard)
    @ApiResource({
        operationId: 'publishShoutout',
        status: 200,
        response: ShoutoutStatusResponseDto,
        params: [{ name: 'id', description: 'Shoutout id' }],
        errors: [
            { status: 404, description: 'Shoutout not found' },
            { status: 409, description: 'Shoutout cannot be published in its current status' },
        ],
    })
    publish(@JwtUser() user: JwtUserPayload, @Param('id') id: string): Promise<ShoutoutStatusResponseDto> {
        return this.shoutoutService.publish(user.sub, id);
    }

    @Post(':id/retry-generation')
    @UseGuards(JwtAuthGuard)
    @ApiResource({
        operationId: 'retryShoutoutGeneration',
        status: 200,
        response: ShoutoutStatusResponseDto,
        params: [{ name: 'id', description: 'Shoutout id' }],
        errors: [
            { status: 404, description: 'Shoutout not found' },
            { status: 409, description: 'Shoutout is not in generation_failed status' },
        ],
    })
    retryGeneration(@JwtUser() user: JwtUserPayload, @Param('id') id: string): Promise<ShoutoutStatusResponseDto> {
        return this.shoutoutService.retryGeneration(user.sub, id);
    }
}
