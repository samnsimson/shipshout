import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    email!: string;

    @ApiProperty()
    name!: string;

    @ApiPropertyOptional()
    username?: string | null;

    @ApiPropertyOptional()
    displayUsername?: string | null;

    @ApiPropertyOptional()
    image?: string | null;

    @ApiPropertyOptional()
    emailVerified?: boolean;
}

export class AuthSessionResponseDto {
    @ApiProperty({ type: AuthUserDto })
    user!: AuthUserDto;

    @ApiProperty({ description: 'JWT access token (15 min)' })
    accessToken!: string;
}
