import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubscriptionPlanLimitsDto {
    @ApiProperty({ example: 1 })
    repos!: number;

    @ApiPropertyOptional({ example: 10, nullable: true, description: 'null means unlimited' })
    releasesPerMonth!: number | null;
}

export class SubscriptionPlanResponseDto {
    @ApiProperty({ example: 'starter' })
    name!: string;

    @ApiProperty({ example: 'Starter' })
    displayName!: string;

    @ApiPropertyOptional({ example: 14, nullable: true })
    trialDays!: number | null;

    @ApiProperty({ type: SubscriptionPlanLimitsDto })
    limits!: SubscriptionPlanLimitsDto;

    @ApiProperty({ example: true })
    isBillable!: boolean;
}

export class SubscriptionPlansListResponseDto {
    @ApiProperty({ type: [SubscriptionPlanResponseDto] })
    plans!: SubscriptionPlanResponseDto[];
}

export class SubscriptionMeResponseDto {
    @ApiProperty({ example: 'free' })
    plan!: string;

    @ApiPropertyOptional({ example: 'trialing', nullable: true })
    status!: string | null;

    @ApiPropertyOptional({ example: '2030-01-01T00:00:00.000Z', nullable: true })
    periodEnd!: string | null;

    @ApiPropertyOptional({ example: 'sub_123', nullable: true })
    stripeSubscriptionId!: string | null;

    @ApiProperty({ type: SubscriptionPlanLimitsDto })
    limits!: SubscriptionPlanLimitsDto;
}
