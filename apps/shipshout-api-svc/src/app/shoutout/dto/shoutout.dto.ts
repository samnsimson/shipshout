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

export class ShoutoutDraftDto {
    @ApiProperty()
    channelKey!: string;

    @ApiProperty()
    title!: string;

    @ApiProperty()
    body!: string;

    @ApiProperty({ type: String, nullable: true })
    editedAt!: string | null;
}

export class ShoutoutDispatchLogDto {
    @ApiProperty()
    channelKey!: string;

    @ApiProperty()
    status!: string;

    @ApiProperty({ type: String, nullable: true })
    error!: string | null;

    @ApiProperty({ type: String, nullable: true })
    sentAt!: string | null;
}

export class ShoutoutDetailResponseDto extends ShoutoutResponseDto {
    @ApiProperty({ type: 'object', additionalProperties: true })
    sourceSummary!: Record<string, unknown>;

    @ApiProperty()
    triggerEventId!: string;

    @ApiProperty({ type: [ShoutoutDraftDto] })
    drafts!: ShoutoutDraftDto[];

    @ApiProperty({ type: [ShoutoutDispatchLogDto] })
    dispatchLogs!: ShoutoutDispatchLogDto[];
}

export class ShoutoutListResponseDto {
    @ApiProperty({ type: [ShoutoutResponseDto] })
    shoutouts!: ShoutoutResponseDto[];
}

export class ShoutoutStatusResponseDto {
    @ApiProperty()
    status!: string;
}
