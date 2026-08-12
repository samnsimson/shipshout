import { Controller, Headers, Param, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResource } from '@shipshout/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { Request, Response } from 'express';
import { WebhookIngestService } from '../services/webhook-ingest.service';

@ApiTags('webhooks')
@Controller('webhooks/github')
export class GithubWebhookController {
    constructor(private readonly webhookIngestService: WebhookIngestService) {}

    @Post(':deliveryToken')
    @AllowAnonymous()
    @ApiResource({
        operationId: 'ingestGithubWebhook',
        status: 200,
        params: [{ name: 'deliveryToken', description: 'Webhook delivery token' }],
        errors: [
            { status: 401, description: 'Invalid webhook signature' },
            { status: 404, description: 'Webhook not found' },
        ],
    })
    async ingestGithubWebhook(
        @Param('deliveryToken') deliveryToken: string,
        @Headers('x-github-event') githubEvent: string | undefined,
        @Headers('x-github-delivery') githubDeliveryId: string | undefined,
        @Headers('x-hub-signature-256') signatureHeader: string | undefined,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
        await this.webhookIngestService.ingest({
            deliveryToken,
            githubEvent: githubEvent ?? 'unknown',
            githubDeliveryId: githubDeliveryId ?? `${deliveryToken}:${rawBody.length}:${Date.now()}`,
            rawBody,
            signatureHeader,
        });
        res.status(200).send({ ok: true });
    }
}
