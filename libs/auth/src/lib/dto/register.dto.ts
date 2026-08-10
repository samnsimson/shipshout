import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
    @ApiProperty({ example: 'Ada Lovelace' })
    @IsString()
    @MinLength(1)
    name!: string;

    @ApiProperty({ example: 'ada', minLength: 3, maxLength: 30 })
    @IsString()
    @MinLength(3)
    @MaxLength(30)
    @Matches(/^[a-zA-Z0-9_.]+$/, { message: 'username may only contain letters, numbers, underscores, and dots' })
    username!: string;

    @ApiPropertyOptional({ example: 'AdaLovelace' })
    @IsOptional()
    @IsString()
    @MinLength(1)
    displayUsername?: string;

    @ApiProperty({ example: 'ada@example.com' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'correct-horse-battery', minLength: 8 })
    @IsString()
    @MinLength(8)
    password!: string;
}
