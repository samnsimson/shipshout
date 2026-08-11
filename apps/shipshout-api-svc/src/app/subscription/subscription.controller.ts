import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResource } from '@shipshout/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
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
    @ApiResource({ operationId: 'getMySubscription', status: 200, response: SubscriptionMeResponseDto })
    getMe(@Session() session: UserSession, @Req() req: Request): Promise<SubscriptionMeResponseDto> {
        return this.subscriptionService.getMe(session.user.id, req.headers);
    }
}
