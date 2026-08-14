import { Body, Controller, Headers, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import Stripe from 'stripe';
import { WorkspaceGuard } from '@shipshout/auth';
import { Tier } from '@shipshout/database';
import { BillingService, SubscriptionSyncService } from '@shipshout/billing';

@Controller()
export class BillingController {
    constructor(
        private billing: BillingService,
        private sync: SubscriptionSyncService,
        private stripe: Stripe,
    ) {}

    @Post('workspaces/:workspaceId/billing/checkout')
    @UseGuards(WorkspaceGuard)
    checkout(@Param('workspaceId') ws: string, @Body() body: { tier: Tier }) {
        return this.billing.createCheckoutSession(ws, body.tier);
    }

    @Post('workspaces/:workspaceId/billing/portal')
    @UseGuards(WorkspaceGuard)
    portal(@Param('workspaceId') ws: string) {
        return this.billing.createPortalSession(ws);
    }

    @Post('billing/webhook')
    @HttpCode(200)
    async webhook(@Req() req: Request, @Headers('stripe-signature') sig: string) {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) throw new Error('Missing STRIPE_WEBHOOK_SECRET');
        const event = this.stripe.webhooks.constructEvent(req.rawBody!, sig, secret);
        await this.sync.applyEvent(event);
        return { received: true };
    }
}
