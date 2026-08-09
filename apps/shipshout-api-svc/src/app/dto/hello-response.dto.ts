import { ApiProperty } from '@nestjs/swagger';

export class HelloResponseDto {
    @ApiProperty({ description: 'Greeting message', example: 'Hello API' })
    message!: string;
}
