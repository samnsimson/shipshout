import { BadRequestException, Controller, Get, NotFoundException, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { WorkspaceGuard } from '@shipshout/auth';
import { ConnectionsService } from '../services/connections.service';
import { parseChannel } from '../utils/oauth.config';

@Controller('workspaces/:workspaceId/connections')
@UseGuards(WorkspaceGuard)
export class ConnectionsController {
    constructor(private svc: ConnectionsService) {}

    @Get()
    list(@Param('workspaceId') ws: string) {
        return this.svc.list(ws);
    }

    @Get(':channel/start')
    start(@Param('workspaceId') ws: string, @Param('channel') channel: string, @Res() res: Response) {
        try {
            res.redirect(this.svc.buildAuthUrl(ws, parseChannel(channel)));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            throw new BadRequestException(message);
        }
    }

    @Get(':channel/callback')
    async callback(@Param('workspaceId') ws: string, @Param('channel') channel: string, @Query('code') code: string, @Res() res: Response) {
        await this.svc.exchangeCode(ws, parseChannel(channel), code);
        res.redirect(`${process.env.WEB_BASE_URL}/${ws}/settings/connections`);
    }

    @Post(':channel/mock-connect')
    async mockConnect(@Param('workspaceId') ws: string, @Param('channel') channel: string) {
        if (process.env.MOCK_CHANNELS !== 'true') throw new NotFoundException();
        try {
            await this.svc.saveTokens(ws, parseChannel(channel), { accessToken: 'mock-token', externalAccountId: 'mock' });
            return { connected: true };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            throw new BadRequestException(message);
        }
    }
}
