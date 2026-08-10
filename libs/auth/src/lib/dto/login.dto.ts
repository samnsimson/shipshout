import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class LoginDto {
    @ApiPropertyOptional({ example: 'ada@example.com', description: 'Required when username is not provided' })
    @ValidateIf((body: LoginDto) => !body.username)
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ example: 'ada', description: 'Required when email is not provided' })
    @ValidateIf((body: LoginDto) => !body.email)
    @IsString()
    @MinLength(3)
    username?: string;

    @ApiProperty({ example: 'correct-horse-battery', minLength: 8 })
    @IsString()
    @MinLength(8)
    password!: string;
}
