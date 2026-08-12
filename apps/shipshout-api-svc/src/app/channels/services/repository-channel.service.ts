import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ChannelTypeEntity, RepositoryChannelEntity, RepositoryChannelTone } from '@shipshout/database';
import { LinkedRepositoryRepository } from '../../repository/repositories/linked-repository.repository';
import { ShoutoutLimitService } from '../../shoutout/services/shoutout-limit.service';
import { PatchRepositoryChannelDto, PatchRepositoryChannelsDto, RepositoryChannelDto, RepositoryChannelListResponseDto } from '../dto/channel.dto';
import { ChannelTypeRepository } from '../repositories/channel-type.repository';
import { RepositoryChannelRepository } from '../repositories/repository-channel.repository';
import { ChannelConfigUtils } from '../utils/channel-config.utils';
import { ChannelEntitlementUtils } from '../utils/channel-entitlement.utils';

@Injectable()
export class RepositoryChannelService {
    constructor(
        private readonly channelTypes: ChannelTypeRepository,
        private readonly repositoryChannels: RepositoryChannelRepository,
        private readonly linkedRepositories: LinkedRepositoryRepository,
        private readonly shoutoutLimits: ShoutoutLimitService,
    ) {}

    async ensureForLinkedRepository(linkedRepositoryId: string): Promise<void> {
        const catalog = await this.channelTypes.findAllActive();
        for (const type of catalog) {
            const existing = await this.repositoryChannels.findByLinkedRepositoryAndKey(linkedRepositoryId, type.key);
            if (existing) continue;
            await this.repositoryChannels.save({
                linkedRepositoryId,
                channelKey: type.key,
                enabled: false,
                tone: 'professional',
                config: {},
            });
        }
    }

    async listForRepo(userId: string, repositoryId: string): Promise<RepositoryChannelListResponseDto> {
        const repo = await this.requireLinkedRepository(userId, repositoryId);
        await this.ensureForLinkedRepository(repo.id);
        const [catalog, rows, limits] = await Promise.all([
            this.channelTypes.findAllActive(),
            this.repositoryChannels.findByLinkedRepositoryId(repo.id),
            this.shoutoutLimits.getLimitsForUser(userId),
        ]);
        const planChannels = limits.channels ?? [];
        const rowByKey = new Map(rows.map((row) => [row.channelKey, row]));
        return { channels: catalog.map((type) => this.toRepositoryChannel(type, rowByKey.get(type.key), planChannels)) };
    }

    async updateForRepo(userId: string, repositoryId: string, body: PatchRepositoryChannelsDto): Promise<RepositoryChannelListResponseDto> {
        const repo = await this.requireLinkedRepository(userId, repositoryId);
        await this.ensureForLinkedRepository(repo.id);
        const [catalog, limits] = await Promise.all([this.channelTypes.findAllActive(), this.shoutoutLimits.getLimitsForUser(userId)]);
        const catalogByKey = new Map(catalog.map((type) => [type.key, type]));
        const planChannels = limits.channels ?? [];

        for (const patch of body.channels) {
            const type = catalogByKey.get(patch.channelKey);
            if (!type) throw new BadRequestException(`Unknown channel: ${patch.channelKey}`);

            const existing = await this.repositoryChannels.findByLinkedRepositoryAndKey(repo.id, patch.channelKey);
            if (!existing) throw new NotFoundException(`Channel config not found for ${patch.channelKey}`);

            if (patch.enabled === true && !ChannelEntitlementUtils.canEnable(patch.channelKey, planChannels))
                throw new ForbiddenException(`Channel ${patch.channelKey} is not available on your plan`);

            const nextConfig = patch.config ?? existing.config;
            if (patch.config !== undefined) {
                const validation = ChannelConfigUtils.validate(type.configSchema, nextConfig);
                if (!validation.ok) throw new BadRequestException(validation.error);
            }

            await this.repositoryChannels.save({
                ...existing,
                enabled: patch.enabled ?? existing.enabled,
                tone: patch.tone ?? existing.tone,
                config: nextConfig,
            });
        }

        return this.listForRepo(userId, repositoryId);
    }

    private async requireLinkedRepository(userId: string, repositoryId: string) {
        const repo = await this.linkedRepositories.findOne({ where: { id: repositoryId, userId } });
        if (!repo) throw new NotFoundException('Linked repository not found');
        return repo;
    }

    private toRepositoryChannel(type: ChannelTypeEntity, row: RepositoryChannelEntity | undefined, planChannels: string[]): RepositoryChannelDto {
        return {
            channelKey: type.key,
            displayName: type.displayName,
            description: type.description,
            kind: type.kind,
            configSchema: type.configSchema,
            availableOnPlan: planChannels.includes(type.key),
            enabled: row?.enabled ?? false,
            tone: row?.tone ?? ('professional' as RepositoryChannelTone),
            config: row?.config ?? {},
        };
    }
}
