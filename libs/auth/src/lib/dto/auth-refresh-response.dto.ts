import { ApiProperty } from '@nestjs/swagger';

export class AuthRefreshResponseDto {
    @ApiProperty({ description: 'JWT access token (15 min)' })
    accessToken!: string;
}
