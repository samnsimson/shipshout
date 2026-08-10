import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    email!: string;

    @ApiProperty()
    name!: string;

    @ApiPropertyOptional()
    image?: string | null;

    @ApiPropertyOptional()
    emailVerified?: boolean;
}

export class AuthSessionDto {
    @ApiPropertyOptional({ description: 'Session token when returned by Better Auth' })
    token?: string;

    @ApiPropertyOptional()
    id?: string;

    @ApiPropertyOptional()
    expiresAt?: string | Date;
}

export class AuthSessionResponseDto {
    @ApiProperty({ type: AuthUserDto })
    user!: AuthUserDto;

    @ApiProperty({ type: AuthSessionDto })
    session!: AuthSessionDto;
}
