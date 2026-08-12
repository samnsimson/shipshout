import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, JwtUser, type JwtUserPayload } from '@shipshout/auth/guard';
import { ApiResource } from '@shipshout/swagger';
import { PaymentsListResponseDto } from './dto/payments-response.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {}

    @Get('me')
    @ApiResource({ operationId: 'listMyPayments', status: 200, response: PaymentsListResponseDto })
    listMine(@JwtUser() user: JwtUserPayload): Promise<PaymentsListResponseDto> {
        return this.paymentsService.listMine({ id: user.sub, stripeCustomerId: user.stripeCustomerId ?? null });
    }
}
