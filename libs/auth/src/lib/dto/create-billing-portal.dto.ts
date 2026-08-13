import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsUrl } from 'class-validator';

export class CreateBillingPortalDto {
    @ApiProperty({ example: 'http://localhost:3000/dashboard/settings' })
    @IsUrl({ require_tld: false })
    returnUrl!: string;

    @ApiProperty({ example: true, description: 'Return portal URL in JSON instead of redirecting' })
    @IsBoolean()
    disableRedirect!: boolean;

    @ApiPropertyOptional({ example: 'user', enum: ['user', 'organization'], default: 'user' })
    @IsOptional()
    @IsIn(['user', 'organization'])
    customerType?: 'user' | 'organization';
}
