import { ConflictException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { GithubConnectionRepository } from '../repositories/github-connection.repository';
import { LinkedRepositoryRepository } from '../repositories/linked-repository.repository';
import { GithubApiService } from '../services/github-api.service';
import { GithubOAuthService } from '../services/github-oauth.service';
import { RepositoryService } from '../services/repository.service';

describe('RepositoryService', () => {
    let service: RepositoryService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RepositoryService,
                {
                    provide: GithubConnectionRepository,
                    useValue: {
                        findByUserId: jest.fn(),
                        upsertForUser: jest.fn(),
                        deleteByUserId: jest.fn(),
                    },
                },
                {
                    provide: LinkedRepositoryRepository,
                    useValue: {
                        findByUserId: jest.fn(),
                        findClaimedGithubRepoIds: jest.fn(),
                        saveLinked: jest.fn(),
                        deleteByIdAndUserId: jest.fn(),
                    },
                },
                {
                    provide: GithubOAuthService,
                    useValue: {
                        getAuthorizationUrl: jest.fn(),
                        verifyState: jest.fn(),
                        exchangeCode: jest.fn(),
                        getSuccessRedirectUrl: jest.fn(),
                        getFailureRedirectUrl: jest.fn(),
                    },
                },
                {
                    provide: GithubApiService,
                    useValue: {
                        getAuthenticatedUser: jest.fn(),
                        listAccessibleRepos: jest.fn(),
                    },
                },
                { provide: ModuleRef, useValue: { get: jest.fn(() => null) } },
            ],
        }).compile();

        service = module.get<RepositoryService>(RepositoryService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});

describe('RepositoryService link uniqueness', () => {
    let service: RepositoryService;
    const linkedRepositories = {
        findByUserId: jest.fn(),
        findClaimedGithubRepoIds: jest.fn(),
        saveLinked: jest.fn(),
        deleteByIdAndUserId: jest.fn(),
    };
    const githubConnections = { findByUserId: jest.fn() };
    const githubApi = { listAccessibleRepos: jest.fn() };

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                RepositoryService,
                { provide: LinkedRepositoryRepository, useValue: linkedRepositories },
                { provide: GithubConnectionRepository, useValue: githubConnections },
                { provide: GithubApiService, useValue: githubApi },
                { provide: GithubOAuthService, useValue: {} },
                { provide: ModuleRef, useValue: { get: jest.fn(() => null) } },
            ],
        }).compile();
        service = module.get(RepositoryService);
        jest.clearAllMocks();
        githubConnections.findByUserId.mockResolvedValue({ accessToken: 'token' });
    });

    it('marks claimedByOtherAccount on listAvailableRepos', async () => {
        githubApi.listAccessibleRepos.mockResolvedValue([
            { githubId: 1, fullName: 'octo/a', name: 'a', owner: 'octo', defaultBranch: 'main', private: false, htmlUrl: 'https://github.com/octo/a' },
            { githubId: 2, fullName: 'octo/b', name: 'b', owner: 'octo', defaultBranch: 'main', private: false, htmlUrl: 'https://github.com/octo/b' },
        ]);
        linkedRepositories.findByUserId.mockResolvedValue([]);
        linkedRepositories.findClaimedGithubRepoIds.mockResolvedValue(new Set(['2']));
        const result = await service.listAvailableRepos('user-1');
        expect(result.repositories[0].claimedByOtherAccount).toBe(false);
        expect(result.repositories[1].claimedByOtherAccount).toBe(true);
    });

    it('throws ConflictException when linking a repo claimed elsewhere', async () => {
        githubApi.listAccessibleRepos.mockResolvedValue([
            { githubId: 2, fullName: 'octo/b', name: 'b', owner: 'octo', defaultBranch: 'main', private: false, htmlUrl: 'https://github.com/octo/b' },
        ]);
        linkedRepositories.findClaimedGithubRepoIds.mockResolvedValue(new Set(['2']));
        await expect(service.linkRepositories('user-1', { githubIds: [2] })).rejects.toThrow(ConflictException);
        expect(linkedRepositories.saveLinked).not.toHaveBeenCalled();
    });
});
