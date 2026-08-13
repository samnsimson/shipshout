import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpgradeSubscriptionDto {
    @ApiProperty({ example: 'starter', description: 'Billable plan name' })
    @IsString()
    @IsIn(['starter', 'pro'])
    plan!: 'starter' | 'pro';

    @ApiProperty({ example: 'http://localhost:3000/dashboard/settings?billing=success' })
    @IsUrl({ require_tld: false })
    successUrl!: string;

    @ApiProperty({ example: 'http://localhost:3000/dashboard/settings?billing=cancelled' })
    @IsUrl({ require_tld: false })
    cancelUrl!: string;

    @ApiProperty({ example: true, description: 'Return checkout URL in JSON instead of redirecting' })
    @IsBoolean()
    disableRedirect!: boolean;

    @ApiPropertyOptional({ example: 'user', enum: ['user', 'organization'], default: 'user' })
    @IsOptional()
    @IsIn(['user', 'organization'])
    customerType?: 'user' | 'organization';
}
