import { BadGatewayException, Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentsListResponseDto } from './dto/payments-response.dto';
import { STRIPE_CLIENT } from './stripe.constants';

type BillingUser = { id: string; stripeCustomerId?: string | null };

@Injectable()
export class PaymentsService {
    constructor(@Inject(STRIPE_CLIENT) private readonly stripe: Stripe) {}

    async listMine(user: BillingUser): Promise<PaymentsListResponseDto> {
        if (!user.stripeCustomerId) return { invoices: [] };
        try {
            const list = await this.stripe.invoices.list({ customer: user.stripeCustomerId, limit: 12 });
            return {
                invoices: list.data.map((inv) => ({
                    id: inv.id,
                    amountDue: inv.amount_due,
                    currency: inv.currency,
                    status: inv.status,
                    createdAt: new Date(inv.created * 1000).toISOString(),
                    hostedInvoiceUrl: inv.hosted_invoice_url,
                })),
            };
        } catch {
            throw new BadGatewayException('Unable to load invoices');
        }
    }
}
