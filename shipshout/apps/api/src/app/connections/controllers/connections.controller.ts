import { BadRequestException, Controller, Delete, Get, Param, Post, Query, Res, UseGuards, Body } from '@nestjs/common';
import { Response } from 'express';
import { WorkspaceGuard } from '@shipshout/auth';
import { ConnectionsService } from '../services/connections.service';
import { EmailConnectDto } from '../dtos/email-connect.dto';
import { parseChannel } from '../utils/oauth.config';

@Controller('workspaces/:workspaceId/connections')
@UseGuards(WorkspaceGuard)
export class ConnectionsController {
    constructor(private svc: ConnectionsService) {}

    @Get()
    list(@Param('workspaceId') ws: string) {
        return this.svc.list(ws);
    }

    @Get('config')
    config() {
        return this.svc.oauthConfig();
    }

    @Post('email/connect')
    async connectEmail(@Param('workspaceId') ws: string, @Body() dto: EmailConnectDto) {
        try {
            await this.svc.connectEmail(ws, dto.apiKey);
            return { connected: true };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            throw new BadRequestException(message);
        }
    }

    @Delete('email')
    async disconnectEmail(@Param('workspaceId') ws: string) {
        await this.svc.disconnectEmail(ws);
        return { disconnected: true };
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
