import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LinkedRepositoryRepository } from './repositories/linked-repository.repository';
import { RepositoryMaintenanceUtils } from './utils/repository-maintenance.utils';
import { TriggerLifecycleService } from '../trigger/services/trigger-lifecycle.service';

@Injectable()
export class RepositoryLinkDedupeSeed implements OnModuleInit {
    private readonly logger = new Logger(RepositoryLinkDedupeSeed.name);

    constructor(
        private readonly linkedRepositories: LinkedRepositoryRepository,
        private readonly triggerLifecycle: TriggerLifecycleService,
    ) {}

    async onModuleInit(): Promise<void> {
        const groups = await this.linkedRepositories.findDuplicateGroups();
        if (groups.length === 0) return;

        for (const group of groups) {
            const { keeper, duplicates } = RepositoryMaintenanceUtils.selectKeeperAndDuplicates(group);
            this.logger.warn(
                `Deduping github_repo_id=${keeper.githubRepoId}: keeping ${keeper.id} (user ${keeper.userId}), removing ${duplicates.length} duplicate(s)`,
            );
            for (const duplicate of duplicates) {
                try {
                    await this.triggerLifecycle.cleanupLinkedRepository(duplicate.userId, duplicate.id);
                } catch (error) {
                    this.logger.warn(`Webhook cleanup failed for linked repo ${duplicate.id}: ${String(error)}`);
                }
                await this.linkedRepositories.deleteById(duplicate.id);
            }
        }
    }
}
