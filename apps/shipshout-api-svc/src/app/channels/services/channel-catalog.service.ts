import { Injectable } from '@nestjs/common';
import { ChannelTypeEntity } from '@shipshout/database';
import { SubscriptionEntitlementService } from '../../subscription/services/subscription-entitlement.service';
import { ChannelCatalogItemDto, ChannelCatalogListResponseDto } from '../dto/channel.dto';
import { ChannelTypeRepository } from '../repositories/channel-type.repository';

@Injectable()
export class ChannelCatalogService {
    constructor(
        private readonly channelTypes: ChannelTypeRepository,
        private readonly entitlements: SubscriptionEntitlementService,
    ) {}

    async listForUser(userId: string): Promise<ChannelCatalogListResponseDto> {
        const [catalog, limits] = await Promise.all([this.channelTypes.findAllActive(), this.entitlements.getLimitsForUser(userId)]);
        const planChannels = limits.channels ?? [];
        return { channels: catalog.map((type) => this.toCatalogItem(type, planChannels)) };
    }

    private toCatalogItem(type: ChannelTypeEntity, planChannels: string[]): ChannelCatalogItemDto {
        return {
            key: type.key,
            displayName: type.displayName,
            description: type.description,
            kind: type.kind,
            configSchema: type.configSchema,
            availableOnPlan: planChannels.includes(type.key),
        };
    }
}
