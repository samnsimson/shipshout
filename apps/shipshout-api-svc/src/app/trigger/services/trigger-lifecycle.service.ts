import { Injectable } from '@nestjs/common';
import { LinkedRepositoryEntity } from '@shipshout/database';
import { GithubConnectionRepository } from '../../repository/repositories/github-connection.repository';
import { LinkedRepositoryRepository } from '../../repository/repositories/linked-repository.repository';
import { RepositoryWebhookRepository } from '../repositories/repository-webhook.repository';
import { GithubWebhookService } from './github-webhook.service';

@Injectable()
export class TriggerLifecycleService {
    constructor(
        private readonly linkedRepositories: LinkedRepositoryRepository,
        private readonly githubConnections: GithubConnectionRepository,
        private readonly repositoryWebhooks: RepositoryWebhookRepository,
        private readonly githubWebhooks: GithubWebhookService,
    ) {}

    async cleanupLinkedRepository(userId: string, linkedRepositoryId: string): Promise<void> {
        const repo = await this.linkedRepositories.findOne({ where: { id: linkedRepositoryId, userId } });
        if (!repo) return;
        await this.deleteGithubWebhookForRepo(userId, repo);
    }

    async cleanupAllForUser(userId: string): Promise<void> {
        const repos = await this.linkedRepositories.findByUserId(userId);
        for (const repo of repos) await this.deleteGithubWebhookForRepo(userId, repo);
    }

    private async deleteGithubWebhookForRepo(userId: string, repo: LinkedRepositoryEntity) {
        const webhook = await this.repositoryWebhooks.findByLinkedRepositoryId(repo.id);
        if (!webhook?.githubHookId) return;
        const connection = await this.githubConnections.findByUserId(userId);
        if (!connection) return;
        try {
            await this.githubWebhooks.deleteRepoWebhook(connection.accessToken, repo.owner, repo.name, webhook.githubHookId);
        } catch {
            // Best-effort external cleanup; DB rows cascade on unlink/disconnect.
        }
    }
}
