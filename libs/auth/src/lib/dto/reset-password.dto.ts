import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
    @ApiProperty({ description: 'Password reset token from email link' })
    @IsString()
    @MinLength(1)
    token!: string;

    @ApiProperty({ example: 'new-correct-horse-battery', minLength: 8 })
    @IsString()
    @MinLength(8)
    newPassword!: string;
}
