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
}
