import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class VerifyOneTimeTokenDto {
    @ApiProperty({ description: 'One-time token from OAuth bridge redirect' })
    @IsString()
    @MinLength(1)
    token!: string;
}
