jest.mock('@shipshout/auth/guard', () => ({
    JwtAuthGuard: class JwtAuthGuard {},
    JwtUser: () => () => undefined,
}));

import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ChannelController } from './channel.controller';
import { ChannelCatalogService } from './services/channel-catalog.service';
import { RepositoryChannelService } from './services/repository-channel.service';

describe('ChannelController', () => {
    let controller: ChannelController;
    let repositoryChannelService: { updateForRepo: jest.Mock };

    beforeEach(async () => {
        repositoryChannelService = { updateForRepo: jest.fn() };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ChannelController],
            providers: [
                {
                    provide: ChannelCatalogService,
                    useValue: { listForUser: jest.fn() },
                },
                {
                    provide: RepositoryChannelService,
                    useValue: {
                        listForRepo: jest.fn(),
                        updateForRepo: repositoryChannelService.updateForRepo,
                    },
                },
            ],
        }).compile();

        controller = module.get<ChannelController>(ChannelController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('returns 403 when enabling channel not on plan', async () => {
        repositoryChannelService.updateForRepo.mockRejectedValue(new ForbiddenException('Channel email_newsletter is not available on your plan'));

        await expect(
            controller.updateRepoChannels({ sub: 'user-1' } as never, 'repo-1', {
                channels: [{ channelKey: 'email_newsletter', enabled: true }],
            }),
        ).rejects.toThrow(ForbiddenException);
    });
});
