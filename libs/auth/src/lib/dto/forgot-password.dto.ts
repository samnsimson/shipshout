import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUrl } from 'class-validator';

export class ForgotPasswordDto {
    @ApiProperty({ example: 'ada@example.com' })
    @IsEmail()
    email!: string;

    @ApiProperty({ required: false, example: 'http://localhost:3000/reset-password' })
    @IsOptional()
    @IsString()
    @IsUrl({ require_tld: false })
    redirectTo?: string;
}
