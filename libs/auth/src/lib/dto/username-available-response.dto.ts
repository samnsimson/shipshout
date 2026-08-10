import { ApiProperty } from '@nestjs/swagger';

export class UsernameAvailableResponseDto {
    @ApiProperty({ example: true })
    available!: boolean;
}
