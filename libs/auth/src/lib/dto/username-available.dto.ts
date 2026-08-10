import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UsernameAvailableDto {
    @ApiProperty({ example: 'ada', minLength: 3, maxLength: 30 })
    @IsString()
    @MinLength(3)
    @MaxLength(30)
    @Matches(/^[a-zA-Z0-9_.]+$/, { message: 'username may only contain letters, numbers, underscores, and dots' })
    username!: string;
}
