import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LinkedRepositoryRepository } from '../repository/repositories/linked-repository.repository';
import { ShoutoutLimitService } from '../shoutout/services/shoutout-limit.service';
import { ChannelTypeRepository } from './repositories/channel-type.repository';
import { RepositoryChannelRepository } from './repositories/repository-channel.repository';
import { RepositoryChannelService } from './services/repository-channel.service';

describe('RepositoryChannelService', () => {
    let service: RepositoryChannelService;
    let channelTypes: { findAllActive: jest.Mock };
    let repositoryChannels: {
        findByLinkedRepositoryId: jest.Mock;
        findByLinkedRepositoryAndKey: jest.Mock;
        save: jest.Mock;
    };
    let linkedRepositories: { findOne: jest.Mock };
    let shoutoutLimits: { getLimitsForUser: jest.Mock };

    beforeEach(async () => {
        channelTypes = { findAllActive: jest.fn() };
        repositoryChannels = {
            findByLinkedRepositoryId: jest.fn(),
            findByLinkedRepositoryAndKey: jest.fn(),
            save: jest.fn(),
        };
        linkedRepositories = { findOne: jest.fn() };
        shoutoutLimits = { getLimitsForUser: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RepositoryChannelService,
                { provide: ChannelTypeRepository, useValue: channelTypes },
                { provide: RepositoryChannelRepository, useValue: repositoryChannels },
                { provide: LinkedRepositoryRepository, useValue: linkedRepositories },
                { provide: ShoutoutLimitService, useValue: shoutoutLimits },
            ],
        }).compile();

        service = module.get<RepositoryChannelService>(RepositoryChannelService);
    });

    it('returns 403 when enabling channel not on plan', async () => {
        linkedRepositories.findOne.mockResolvedValue({ id: 'repo-1', userId: 'user-1' });
        channelTypes.findAllActive.mockResolvedValue([
            { key: 'email_alert', displayName: 'Email alert', description: '', kind: 'notify', configSchema: {}, sortOrder: 1 },
            { key: 'email_newsletter', displayName: 'Email newsletter', description: '', kind: 'publish', configSchema: {}, sortOrder: 2 },
        ]);
        shoutoutLimits.getLimitsForUser.mockResolvedValue({ repos: 1, releasesPerMonth: 10, channels: ['email_alert'] });
        repositoryChannels.findByLinkedRepositoryAndKey.mockImplementation((_repoId: string, key: string) =>
            Promise.resolve({ id: `row-${key}`, linkedRepositoryId: 'repo-1', channelKey: key, enabled: false, tone: 'professional', config: {} }),
        );
        repositoryChannels.save.mockImplementation((row: unknown) => Promise.resolve(row));

        await expect(
            service.updateForRepo('user-1', 'repo-1', {
                channels: [{ channelKey: 'email_newsletter', enabled: true }],
            }),
        ).rejects.toThrow(ForbiddenException);
    });
});
