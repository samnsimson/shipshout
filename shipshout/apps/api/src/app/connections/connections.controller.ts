import { BadRequestException, Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { WorkspaceGuard } from '@shipshout/auth';
import { ConnectionsService } from './connections.service';
import { parseChannel } from './oauth.config';

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
}
