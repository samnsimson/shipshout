import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResource } from '@shipshout/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { PaymentsListResponseDto } from './dto/payments-response.dto';
import { PaymentsService } from './payments.service';

type SessionUserWithStripe = UserSession['user'] & { stripeCustomerId?: string | null };

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {}

    @Get('me')
    @ApiResource({ operationId: 'listMyPayments', status: 200, response: PaymentsListResponseDto })
    listMine(@Session() session: UserSession): Promise<PaymentsListResponseDto> {
        return this.paymentsService.listMine(session.user as SessionUserWithStripe);
    }
}
