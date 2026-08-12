import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShoutoutResponseDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    title!: string;

    @ApiProperty()
    status!: string;

    @ApiProperty()
    linkedRepositoryId!: string;

    @ApiProperty()
    repositoryFullName!: string;

    @ApiProperty()
    triggerType!: string;

    @ApiProperty()
    createdAt!: string;
}

export class ShoutoutDetailResponseDto extends ShoutoutResponseDto {
    @ApiProperty({ type: 'object', additionalProperties: true })
    sourceSummary!: Record<string, unknown>;

    @ApiProperty()
    triggerEventId!: string;
}

export class ShoutoutListResponseDto {
    @ApiProperty({ type: [ShoutoutResponseDto] })
    shoutouts!: ShoutoutResponseDto[];
}
