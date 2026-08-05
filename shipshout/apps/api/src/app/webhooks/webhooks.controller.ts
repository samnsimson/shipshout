import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
    constructor(private svc: WebhooksService) {}

    @Post('github')
    @HttpCode(200)
    async github(@Req() req: Request, @Headers() headers: Record<string, string>) {
        return this.svc.handleGithub(req.rawBody!, headers);
    }

    @Post('linear')
    @HttpCode(200)
    linear(@Req() req: Request, @Headers() headers: Record<string, string>) {
        return this.svc.handleLinear(req.rawBody!, headers);
    }

    @Post('jira')
    @HttpCode(200)
    jira(@Req() req: Request, @Headers() headers: Record<string, string>) {
        return this.svc.handleJira(req.rawBody!, headers, req.query as Record<string, string>);
    }
}
