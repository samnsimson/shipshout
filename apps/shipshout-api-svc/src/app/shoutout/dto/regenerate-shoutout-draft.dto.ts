import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RegenerateShoutoutDraftDto {
    @ApiPropertyOptional({
        description: 'Optional guidance for regeneration (tone, emphasis, length). Must not change the release subject matter.',
        maxLength: 500,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    userPrompt?: string;
}
