import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBrandDto {
    @IsEnum(['dev_focused', 'professional', 'hype_startup'])
    tone!: 'dev_focused' | 'professional' | 'hype_startup';

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    customInstructions?: string;

    @IsBoolean()
    emojiPolicy!: boolean;
}
