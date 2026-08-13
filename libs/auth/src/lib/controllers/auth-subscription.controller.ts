import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResource } from '@shipshout/swagger';
import type { Request as ExpressRequest } from 'express';
import { CreateBillingPortalDto } from '../dto/create-billing-portal.dto';
import { StripeRedirectUrlResponseDto } from '../dto/stripe-redirect-url-response.dto';
import { UpgradeSubscriptionDto } from '../dto/upgrade-subscription.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService } from '../services/auth.service';

@ApiTags('auth-service')
@Controller('auth-service/subscription')
@UseGuards(JwtAuthGuard)
export class AuthSubscriptionController {
    constructor(private readonly authService: AuthService) {}

    @Post('upgrade')
    @ApiResource({
        operationId: 'upgradeSubscription',
        status: 200,
        body: UpgradeSubscriptionDto,
        response: StripeRedirectUrlResponseDto,
        errors: [{ status: 400, description: 'Validation or Stripe error' }, { status: 401, description: 'Unauthorized' }],
    })
    upgrade(@Body() body: UpgradeSubscriptionDto, @Req() req: ExpressRequest): Promise<StripeRedirectUrlResponseDto> {
        return this.authService.upgradeSubscription(body, req.headers);
    }

    @Post('billing-portal')
    @ApiResource({
        operationId: 'createBillingPortal',
        status: 200,
        body: CreateBillingPortalDto,
        response: StripeRedirectUrlResponseDto,
        errors: [{ status: 400, description: 'Validation or Stripe error' }, { status: 401, description: 'Unauthorized' }],
    })
    billingPortal(@Body() body: CreateBillingPortalDto, @Req() req: ExpressRequest): Promise<StripeRedirectUrlResponseDto> {
        return this.authService.createBillingPortal(body, req.headers);
    }
}
