import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LinkedRepositoryEntity, RepositoryWebhookEntity } from '@shipshout/database';
import { GithubConnectionRepository } from '../../repository/repositories/github-connection.repository';
import { LinkedRepositoryRepository } from '../../repository/repositories/linked-repository.repository';
import { LinkedRepositoryDetailResponseDto, RepositoryTriggersResponseDto, RepositoryWebhookStatusDto, UpdateRepositoryTriggersDto } from '../dto/trigger.dto';
import { RepositoryTriggerRepository } from '../repositories/repository-trigger.repository';
import { RepositoryWebhookRepository } from '../repositories/repository-webhook.repository';
import { GithubWebhookApiError, GithubWebhookService } from './github-webhook.service';
import { TriggerEventUtils } from '../utils/trigger-event.utils';
import { WebhookSecretUtils } from '../utils/webhook-secret.utils';
import { WebhookUrlUtils } from '../utils/webhook-url.utils';

@Injectable()
export class TriggerService {
    private readonly apiBaseUrl: string;
    private readonly encryptionKey: string;

    constructor(
        private readonly config: ConfigService,
        private readonly linkedRepositories: LinkedRepositoryRepository,
        private readonly githubConnections: GithubConnectionRepository,
        private readonly repositoryTriggers: RepositoryTriggerRepository,
        private readonly repositoryWebhooks: RepositoryWebhookRepository,
        private readonly githubWebhooks: GithubWebhookService,
    ) {
        this.apiBaseUrl = this.config.get<string>('API_BASE_URL') ?? this.config.getOrThrow<string>('BETTER_AUTH_BASE_URL');
        this.encryptionKey = this.config.get<string>('WEBHOOK_SECRET_ENCRYPTION_KEY') ?? this.config.getOrThrow<string>('BETTER_AUTH_SECRET');
    }

    async seedForLinkedRepository(linkedRepositoryId: string): Promise<void> {
        await this.repositoryTriggers.ensureForLinkedRepository(linkedRepositoryId);
    }

    async getRepositoryDetail(userId: string, repositoryId: string): Promise<LinkedRepositoryDetailResponseDto> {
        const repo = await this.requireLinkedRepository(userId, repositoryId);
        const triggers = await this.repositoryTriggers.ensureForLinkedRepository(repo.id);
        const webhook = await this.repositoryWebhooks.findByLinkedRepositoryId(repo.id);
        return {
            ...this.toRepoBase(repo),
            triggers: this.toTriggersDto(triggers),
            activeTriggerCount: TriggerEventUtils.countEnabled(triggers),
            webhook: this.toWebhookDto(webhook),
        };
    }

    async getTriggers(userId: string, repositoryId: string): Promise<RepositoryTriggersResponseDto> {
        const repo = await this.requireLinkedRepository(userId, repositoryId);
        const triggers = await this.repositoryTriggers.ensureForLinkedRepository(repo.id);
        const webhook = await this.repositoryWebhooks.findByLinkedRepositoryId(repo.id);
        return { triggers: this.toTriggersDto(triggers), webhook: this.toWebhookDto(webhook) };
    }

    async updateTriggers(userId: string, repositoryId: string, body: UpdateRepositoryTriggersDto): Promise<RepositoryTriggersResponseDto> {
        const repo = await this.requireLinkedRepository(userId, repositoryId);
        const existing = await this.repositoryTriggers.ensureForLinkedRepository(repo.id);
        const triggers = await this.repositoryTriggers.save({ ...existing, ...body });
        const webhook = await this.syncWebhook(userId, repo, triggers);
        return { triggers: this.toTriggersDto(triggers), webhook: this.toWebhookDto(webhook) };
    }

    buildWebhookCallbackUrl(deliveryToken: string): string {
        return `${this.apiBaseUrl.replace(/\/$/, '')}/webhooks/github/${deliveryToken}`;
    }

    decryptWebhookSecret(webhook: RepositoryWebhookEntity): string {
        return WebhookSecretUtils.decrypt(webhook.secretEncrypted, this.encryptionKey);
    }

    private async syncWebhook(userId: string, repo: LinkedRepositoryEntity, triggers: { release: boolean; tagPush: boolean; branchPush: boolean }) {
        const enabled = TriggerEventUtils.hasAnyEnabled(triggers);
        let webhook = await this.repositoryWebhooks.findByLinkedRepositoryId(repo.id);

        if (!enabled) {
            if (webhook?.githubHookId) await this.deleteGithubWebhook(userId, repo, webhook.githubHookId);
            if (webhook) await this.repositoryWebhooks.delete({ id: webhook.id });
            return null;
        }

        const plaintextSecret = webhook ? WebhookSecretUtils.decrypt(webhook.secretEncrypted, this.encryptionKey) : WebhookSecretUtils.generateSecret();
        const deliveryToken = webhook?.deliveryToken ?? WebhookSecretUtils.generateDeliveryToken();
        const callbackUrl = this.buildWebhookCallbackUrl(deliveryToken);
        const config = { url: callbackUrl, secret: plaintextSecret, events: ['release', 'create', 'push'] };

        if (!webhook) {
            webhook = await this.repositoryWebhooks.save({
                linkedRepositoryId: repo.id,
                deliveryToken,
                secretEncrypted: WebhookSecretUtils.encrypt(plaintextSecret, this.encryptionKey),
                githubHookId: null,
                status: 'pending',
                lastDeliveryAt: null,
                lastError: null,
            });
        }

        if (WebhookUrlUtils.isLocalhost(callbackUrl)) {
            return this.repositoryWebhooks.save({
                ...webhook,
                deliveryToken,
                secretEncrypted: WebhookSecretUtils.encrypt(plaintextSecret, this.encryptionKey),
                status: 'manual_required',
                lastError: WebhookUrlUtils.localhostManualMessage(),
            });
        }

        try {
            const connection = await this.requireGithubConnection(userId);
            const githubHookId = await this.ensureGithubWebhook(connection.accessToken, repo, webhook, config);
            return this.repositoryWebhooks.save({ ...webhook, githubHookId, status: 'active', lastError: null });
        } catch (error) {
            const isManual =
                (error instanceof GithubWebhookApiError && (error.status === 403 || error.status === 422)) ||
                (error instanceof Error && WebhookUrlUtils.isLocalhost(callbackUrl));
            const status = isManual ? 'manual_required' : 'error';
            const lastError = error instanceof Error ? error.message : 'Webhook registration failed';
            return this.repositoryWebhooks.save({ ...webhook, deliveryToken, secretEncrypted: WebhookSecretUtils.encrypt(plaintextSecret, this.encryptionKey), status, lastError });
        }
    }

    private async ensureGithubWebhook(
        accessToken: string,
        repo: LinkedRepositoryEntity,
        webhook: RepositoryWebhookEntity,
        config: { url: string; secret: string; events: string[] },
    ): Promise<string> {
        if (webhook.githubHookId) {
            await this.githubWebhooks.updateRepoWebhook(accessToken, repo.owner, repo.name, webhook.githubHookId, config);
            return webhook.githubHookId;
        }

        const existingByUrl = await this.githubWebhooks.findRepoWebhookByCallbackUrl(accessToken, repo.owner, repo.name, config.url);
        if (existingByUrl) {
            await this.githubWebhooks.updateRepoWebhook(accessToken, repo.owner, repo.name, String(existingByUrl.id), config);
            return String(existingByUrl.id);
        }

        try {
            const created = await this.githubWebhooks.createRepoWebhook(accessToken, repo.owner, repo.name, config);
            return String(created.id);
        } catch (error) {
            if (!(error instanceof GithubWebhookApiError) || error.status !== 422) throw error;

            const existing = await this.githubWebhooks.findRepoWebhookByCallbackUrl(accessToken, repo.owner, repo.name, config.url);
            const reclaimed = existing ?? (await this.githubWebhooks.findShipshoutRepoWebhook(accessToken, repo.owner, repo.name, this.apiBaseUrl));
            if (!reclaimed) throw error;

            await this.githubWebhooks.updateRepoWebhook(accessToken, repo.owner, repo.name, String(reclaimed.id), config);
            return String(reclaimed.id);
        }
    }

    private async deleteGithubWebhook(userId: string, repo: LinkedRepositoryEntity, hookId: string) {
        try {
            const connection = await this.githubConnections.findByUserId(userId);
            if (!connection) return;
            await this.githubWebhooks.deleteRepoWebhook(connection.accessToken, repo.owner, repo.name, hookId);
        } catch {
            // Best-effort cleanup when unlinking or disabling triggers.
        }
    }

    private async requireLinkedRepository(userId: string, repositoryId: string): Promise<LinkedRepositoryEntity> {
        const repo = await this.linkedRepositories.findOne({ where: { id: repositoryId, userId } });
        if (!repo) throw new NotFoundException('Linked repository not found');
        return repo;
    }

    private async requireGithubConnection(userId: string) {
        const connection = await this.githubConnections.findByUserId(userId);
        if (!connection) throw new NotFoundException('GitHub is not connected');
        return connection;
    }

    private toRepoBase(repo: LinkedRepositoryEntity) {
        return {
            id: repo.id,
            githubId: Number(repo.githubRepoId),
            fullName: repo.fullName,
            name: repo.name,
            owner: repo.owner,
            defaultBranch: repo.defaultBranch,
            private: repo.private,
            htmlUrl: repo.htmlUrl,
            linkedAt: repo.linkedAt.toISOString(),
        };
    }

    private toTriggersDto(triggers: { release: boolean; tagPush: boolean; branchPush: boolean }) {
        return { release: triggers.release, tagPush: triggers.tagPush, branchPush: triggers.branchPush };
    }

    private toWebhookDto(webhook: RepositoryWebhookEntity | null): RepositoryWebhookStatusDto {
        if (!webhook) return { status: 'not_configured', lastDeliveryAt: null, lastError: null, manualSetup: null };
        const manualSetup =
            webhook.status === 'manual_required'
                ? {
                      url: this.buildWebhookCallbackUrl(webhook.deliveryToken),
                      secret: WebhookSecretUtils.decrypt(webhook.secretEncrypted, this.encryptionKey),
                      instructions: 'Add this webhook in GitHub → Settings → Webhooks → Add webhook',
                  }
                : null;
        return {
            status: webhook.status,
            lastDeliveryAt: webhook.lastDeliveryAt?.toISOString() ?? null,
            lastError: webhook.lastError,
            manualSetup,
        };
    }
}
