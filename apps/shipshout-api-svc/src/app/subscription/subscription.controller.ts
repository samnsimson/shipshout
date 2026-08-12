import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, JwtUser, type JwtUserPayload } from '@shipshout/auth/guard';
import { ApiResource } from '@shipshout/swagger';
import type { Request } from 'express';
import { SubscriptionMeResponseDto, SubscriptionPlansListResponseDto } from './dto/subscription-response.dto';
import { SubscriptionService } from './subscription.service';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
    constructor(private readonly subscriptionService: SubscriptionService) {}

    @Get('plans')
    @ApiResource({ operationId: 'listSubscriptionPlans', status: 200, response: SubscriptionPlansListResponseDto })
    listPlans(): Promise<SubscriptionPlansListResponseDto> {
        return this.subscriptionService.listPlans();
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiResource({ operationId: 'getMySubscription', status: 200, response: SubscriptionMeResponseDto })
    getMe(@JwtUser() user: JwtUserPayload, @Req() req: Request): Promise<SubscriptionMeResponseDto> {
        return this.subscriptionService.getMe(user.sub, req.headers);
    }
}
