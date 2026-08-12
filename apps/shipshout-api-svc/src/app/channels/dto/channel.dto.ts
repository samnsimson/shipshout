import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelKind, RepositoryChannelTone } from '@shipshout/database';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ChannelCatalogItemDto {
    @ApiProperty()
    key!: string;

    @ApiProperty()
    displayName!: string;

    @ApiProperty()
    description!: string;

    @ApiProperty({ enum: ['notify', 'publish'] })
    kind!: ChannelKind;

    @ApiProperty({ type: 'object', additionalProperties: true })
    configSchema!: Record<string, unknown>;

    @ApiProperty()
    availableOnPlan!: boolean;
}

export class ChannelCatalogListResponseDto {
    @ApiProperty({ type: [ChannelCatalogItemDto] })
    channels!: ChannelCatalogItemDto[];
}

export class RepositoryChannelDto {
    @ApiProperty()
    channelKey!: string;

    @ApiProperty()
    displayName!: string;

    @ApiProperty()
    description!: string;

    @ApiProperty({ enum: ['notify', 'publish'] })
    kind!: ChannelKind;

    @ApiProperty({ type: 'object', additionalProperties: true })
    configSchema!: Record<string, unknown>;

    @ApiProperty()
    availableOnPlan!: boolean;

    @ApiProperty()
    enabled!: boolean;

    @ApiProperty({ enum: ['professional', 'dev_focused', 'hype'] })
    tone!: RepositoryChannelTone;

    @ApiProperty({ type: 'object', additionalProperties: true })
    config!: Record<string, unknown>;
}

export class RepositoryChannelListResponseDto {
    @ApiProperty({ type: [RepositoryChannelDto] })
    channels!: RepositoryChannelDto[];
}

export class PatchRepositoryChannelDto {
    @ApiProperty()
    @IsString()
    channelKey!: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    enabled?: boolean;

    @ApiPropertyOptional({ enum: ['professional', 'dev_focused', 'hype'] })
    @IsOptional()
    @IsIn(['professional', 'dev_focused', 'hype'])
    tone?: RepositoryChannelTone;

    @ApiPropertyOptional({ type: 'object', additionalProperties: true })
    @IsOptional()
    @IsObject()
    config?: Record<string, unknown>;
}

export class PatchRepositoryChannelsDto {
    @ApiProperty({ type: [PatchRepositoryChannelDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PatchRepositoryChannelDto)
    channels!: PatchRepositoryChannelDto[];
}
