import { ApiProperty } from '@nestjs/swagger';

export class StripeRedirectUrlResponseDto {
    @ApiProperty({ example: 'https://checkout.stripe.com/c/pay/cs_test_abc123' })
    url!: string;
}
