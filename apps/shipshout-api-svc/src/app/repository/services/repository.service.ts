import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GithubConnectionEntity, LinkedRepositoryEntity } from '@shipshout/database';
import { GithubConnectionResponseDto } from '../dto/github-connection-response.dto';
import { GithubRepoDto, GithubRepoListResponseDto } from '../dto/github-repo.dto';
import { LinkRepositoriesDto } from '../dto/link-repositories.dto';
import {
    LinkRepositoriesResponseDto,
    LinkedRepositoryListResponseDto,
    LinkedRepositoryResponseDto,
} from '../dto/linked-repository-response.dto';
import { GithubRepoSummary } from '../interfaces/github.types';
import { GithubConnectionRepository } from '../repositories/github-connection.repository';
import { LinkedRepositoryRepository } from '../repositories/linked-repository.repository';
import { GithubApiService } from './github-api.service';
import { GithubOAuthService } from './github-oauth.service';

@Injectable()
export class RepositoryService {
    constructor(
        private readonly githubConnections: GithubConnectionRepository,
        private readonly linkedRepositories: LinkedRepositoryRepository,
        private readonly githubOAuth: GithubOAuthService,
        private readonly githubApi: GithubApiService,
    ) {}

    getConnectUrl(userId: string): string {
        return this.githubOAuth.getAuthorizationUrl(userId);
    }

    getSuccessRedirectUrl(): string {
        return this.githubOAuth.getSuccessRedirectUrl();
    }

    getFailureRedirectUrl(reason: string): string {
        return this.githubOAuth.getFailureRedirectUrl(reason);
    }

    async completeGithubConnection(code: string, state: string): Promise<string> {
        const { userId } = this.githubOAuth.verifyState(state);
        const { accessToken, scopes } = await this.githubOAuth.exchangeCode(code);
        const githubUser = await this.githubApi.getAuthenticatedUser(accessToken);

        await this.githubConnections.upsertForUser(userId, {
            githubUserId: String(githubUser.id),
            githubUsername: githubUser.login,
            accessToken,
            scopes,
        });

        return this.getSuccessRedirectUrl();
    }

    async getGithubConnection(userId: string): Promise<GithubConnectionResponseDto> {
        const connection = await this.githubConnections.findByUserId(userId);
        if (!connection) return { connected: false };
        return {
            connected: true,
            githubUsername: connection.githubUsername,
            scopes: connection.scopes,
        };
    }

    async disconnectGithub(userId: string): Promise<void> {
        await this.githubConnections.deleteByUserId(userId);
    }

    async listAvailableRepos(userId: string): Promise<GithubRepoListResponseDto> {
        const connection = await this.requireConnection(userId);
        const [available, linked] = await Promise.all([
            this.githubApi.listAccessibleRepos(connection.accessToken),
            this.linkedRepositories.findByUserId(userId),
        ]);
        const linkedIds = new Set(linked.map((repo) => repo.githubRepoId));

        return {
            repositories: available.map((repo) => this.toGithubRepoDto(repo, linkedIds.has(String(repo.githubId)))),
        };
    }

    async listLinkedRepos(userId: string): Promise<LinkedRepositoryListResponseDto> {
        const repositories = await this.linkedRepositories.findByUserId(userId);
        return { repositories: repositories.map((repo) => this.toLinkedRepositoryDto(repo)) };
    }

    async linkRepositories(userId: string, body: LinkRepositoriesDto): Promise<LinkRepositoriesResponseDto> {
        const connection = await this.requireConnection(userId);
        const available = await this.githubApi.listAccessibleRepos(connection.accessToken);
        const availableById = new Map(available.map((repo) => [repo.githubId, repo]));

        const linked: LinkedRepositoryResponseDto[] = [];
        for (const githubId of body.githubIds) {
            const repo = availableById.get(githubId);
            if (!repo) throw new BadRequestException(`Repository ${githubId} is not accessible with the connected GitHub account`);

            const saved = await this.linkedRepositories.saveLinked(userId, {
                githubRepoId: String(repo.githubId),
                fullName: repo.fullName,
                name: repo.name,
                owner: repo.owner,
                defaultBranch: repo.defaultBranch,
                private: repo.private,
                htmlUrl: repo.htmlUrl,
            });
            linked.push(this.toLinkedRepositoryDto(saved));
        }

        return { linked };
    }

    async unlinkRepository(userId: string, repositoryId: string): Promise<void> {
        const result = await this.linkedRepositories.deleteByIdAndUserId(repositoryId, userId);
        if (!result.affected) throw new NotFoundException('Linked repository not found');
    }

    private async requireConnection(userId: string): Promise<GithubConnectionEntity> {
        const connection = await this.githubConnections.findByUserId(userId);
        if (!connection) throw new BadRequestException('Connect GitHub before managing repositories');
        return connection;
    }

    private toGithubRepoDto(repo: GithubRepoSummary, linked = false): GithubRepoDto {
        return {
            githubId: repo.githubId,
            fullName: repo.fullName,
            name: repo.name,
            owner: repo.owner,
            defaultBranch: repo.defaultBranch,
            private: repo.private,
            htmlUrl: repo.htmlUrl,
            linked,
        };
    }

    private toLinkedRepositoryDto(repo: LinkedRepositoryEntity): LinkedRepositoryResponseDto {
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
}
