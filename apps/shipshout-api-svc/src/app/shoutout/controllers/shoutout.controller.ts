import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, JwtUser, type JwtUserPayload } from '@shipshout/auth/guard';
import { ApiResource } from '@shipshout/swagger';
import { ShoutoutDetailResponseDto, ShoutoutListResponseDto } from '../dto/shoutout.dto';
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
}
