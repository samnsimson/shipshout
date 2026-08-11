import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentInvoiceDto {
    @ApiProperty({ example: 'in_123' })
    id!: string;

    @ApiProperty({ example: 1900 })
    amountDue!: number;

    @ApiProperty({ example: 'usd' })
    currency!: string;

    @ApiPropertyOptional({ example: 'paid', nullable: true })
    status!: string | null;

    @ApiProperty({ example: '2030-01-01T00:00:00.000Z' })
    createdAt!: string;

    @ApiPropertyOptional({ example: 'https://invoice.stripe.com/i/...', nullable: true })
    hostedInvoiceUrl!: string | null;
}

export class PaymentsListResponseDto {
    @ApiProperty({ type: [PaymentInvoiceDto] })
    invoices!: PaymentInvoiceDto[];
}
