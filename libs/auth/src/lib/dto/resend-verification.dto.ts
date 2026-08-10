import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
    @ApiProperty({ example: 'ada@example.com' })
    @IsEmail()
    email!: string;
}
