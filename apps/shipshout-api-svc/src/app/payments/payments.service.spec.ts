import { BadGatewayException } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
    const stripe = {
        invoices: {
            list: jest.fn(),
        },
    };

    let service: PaymentsService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new PaymentsService(stripe as unknown as Stripe);
    });

    it('returns empty list when user has no stripe customer', async () => {
        await expect(service.listMine({ id: 'u1' })).resolves.toEqual({ invoices: [] });
        expect(stripe.invoices.list).not.toHaveBeenCalled();
    });

    it('maps stripe invoices', async () => {
        stripe.invoices.list.mockResolvedValue({
            data: [
                {
                    id: 'in_1',
                    amount_due: 1900,
                    currency: 'usd',
                    status: 'paid',
                    created: 1_700_000_000,
                    hosted_invoice_url: 'https://invoice.example/1',
                },
            ],
        });
        await expect(service.listMine({ id: 'u1', stripeCustomerId: 'cus_1' })).resolves.toEqual({
            invoices: [
                {
                    id: 'in_1',
                    amountDue: 1900,
                    currency: 'usd',
                    status: 'paid',
                    createdAt: new Date(1_700_000_000 * 1000).toISOString(),
                    hostedInvoiceUrl: 'https://invoice.example/1',
                },
            ],
        });
    });

    it('throws BadGatewayException when stripe fails', async () => {
        stripe.invoices.list.mockRejectedValue(new Error('stripe down'));
        await expect(service.listMine({ id: 'u1', stripeCustomerId: 'cus_1' })).rejects.toBeInstanceOf(BadGatewayException);
    });
});
