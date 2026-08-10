import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
    @ApiProperty({ example: 'Ada Lovelace' })
    @IsString()
    @MinLength(1)
    name!: string;

    @ApiProperty({ example: 'ada@example.com' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'correct-horse-battery', minLength: 8 })
    @IsString()
    @MinLength(8)
    password!: string;
}
