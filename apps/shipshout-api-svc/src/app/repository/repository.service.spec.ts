import { Test, TestingModule } from '@nestjs/testing';
import { GithubApiService } from './services/github-api.service';
import { GithubOAuthService } from './services/github-oauth.service';
import { RepositoryService } from './services/repository.service';
import { GithubConnectionRepository } from './repositories/github-connection.repository';
import { LinkedRepositoryRepository } from './repositories/linked-repository.repository';

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
            ],
        }).compile();

        service = module.get<RepositoryService>(RepositoryService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
