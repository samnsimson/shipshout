import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateRepositoryTriggersDto {
    @ApiProperty()
    @IsBoolean()
    release!: boolean;

    @ApiProperty()
    @IsBoolean()
    tagPush!: boolean;

    @ApiProperty()
    @IsBoolean()
    branchPush!: boolean;
}

export class RepositoryTriggersDto {
    @ApiProperty()
    release!: boolean;

    @ApiProperty()
    tagPush!: boolean;

    @ApiProperty()
    branchPush!: boolean;
}

export class WebhookManualSetupDto {
    @ApiProperty()
    url!: string;

    @ApiProperty()
    secret!: string;

    @ApiProperty()
    instructions!: string;
}

export class RepositoryWebhookStatusDto {
    @ApiProperty({ enum: ['pending', 'active', 'manual_required', 'error', 'not_configured'] })
    status!: 'pending' | 'active' | 'manual_required' | 'error' | 'not_configured';

    @ApiPropertyOptional({ type: String, nullable: true })
    lastDeliveryAt!: string | null;

    @ApiPropertyOptional({ type: String, nullable: true })
    lastError!: string | null;

    @ApiPropertyOptional({ type: WebhookManualSetupDto, nullable: true })
    manualSetup!: WebhookManualSetupDto | null;
}

export class RepositoryTriggersResponseDto {
    @ApiProperty({ type: RepositoryTriggersDto })
    triggers!: RepositoryTriggersDto;

    @ApiProperty({ type: RepositoryWebhookStatusDto })
    webhook!: RepositoryWebhookStatusDto;
}

export class TriggerEventResponseDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    eventType!: string;

    @ApiProperty()
    triggerType!: string;

    @ApiProperty()
    summary!: string;

    @ApiProperty()
    status!: string;

    @ApiPropertyOptional({ type: String, nullable: true })
    shoutoutId!: string | null;

    @ApiProperty()
    createdAt!: string;
}

export class TriggerEventListResponseDto {
    @ApiProperty({ type: [TriggerEventResponseDto] })
    events!: TriggerEventResponseDto[];
}

export class LinkedRepositoryDetailResponseDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    githubId!: number;

    @ApiProperty()
    fullName!: string;

    @ApiProperty()
    name!: string;

    @ApiProperty()
    owner!: string;

    @ApiProperty()
    defaultBranch!: string;

    @ApiProperty()
    private!: boolean;

    @ApiProperty()
    htmlUrl!: string;

    @ApiProperty()
    linkedAt!: string;

    @ApiProperty({ type: RepositoryTriggersDto })
    triggers!: RepositoryTriggersDto;

    @ApiProperty()
    activeTriggerCount!: number;

    @ApiProperty({ type: RepositoryWebhookStatusDto })
    webhook!: RepositoryWebhookStatusDto;
}
