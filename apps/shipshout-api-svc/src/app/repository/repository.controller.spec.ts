jest.mock('@thallesp/nestjs-better-auth', () => ({
    AllowAnonymous: () => () => undefined,
    Session: () => () => undefined,
}));

import { Test, TestingModule } from '@nestjs/testing';
import { RepositoryController } from './controllers/repository.controller';
import { RepositoryService } from './services/repository.service';

describe('RepositoryController', () => {
    let controller: RepositoryController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [RepositoryController],
            providers: [
                {
                    provide: RepositoryService,
                    useValue: {
                        getGithubConnection: jest.fn(),
                        getConnectUrl: jest.fn(),
                        completeGithubConnection: jest.fn(),
                        getSuccessRedirectUrl: jest.fn(),
                        getFailureRedirectUrl: jest.fn(),
                        disconnectGithub: jest.fn(),
                        listAvailableRepos: jest.fn(),
                        listLinkedRepos: jest.fn(),
                        linkRepositories: jest.fn(),
                        unlinkRepository: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<RepositoryController>(RepositoryController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
