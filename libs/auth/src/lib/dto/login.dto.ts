import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
    @ApiProperty({
        example: 'ada@example.com',
        description: 'Email address or username',
    })
    @IsString()
    @MinLength(3)
    login!: string;

    @ApiProperty({ example: 'correct-horse-battery', minLength: 8 })
    @IsString()
    @MinLength(8)
    password!: string;
}
