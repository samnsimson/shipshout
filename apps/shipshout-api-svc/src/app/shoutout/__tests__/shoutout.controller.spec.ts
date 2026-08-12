jest.mock('@shipshout/auth/guard', () => ({
    JwtAuthGuard: class JwtAuthGuard {},
    JwtUser: () => () => undefined,
}));

import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ShoutoutController } from '../controllers/shoutout.controller';
import { ShoutoutService } from '../services/shoutout.service';

describe('ShoutoutController', () => {
    let controller: ShoutoutController;
    let shoutoutService: { publish: jest.Mock };

    beforeEach(async () => {
        shoutoutService = { publish: jest.fn() };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ShoutoutController],
            providers: [
                {
                    provide: ShoutoutService,
                    useValue: {
                        listForUser: jest.fn(),
                        getById: jest.fn(),
                        streamEvents: jest.fn(),
                        updateDraft: jest.fn(),
                        publish: shoutoutService.publish,
                        retryGeneration: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<ShoutoutController>(ShoutoutController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('returns 409 when publish is called while shoutout is generating', async () => {
        shoutoutService.publish.mockRejectedValue(new ConflictException('Cannot publish shoutout while status is generating'));

        await expect(controller.publish({ sub: 'user-1' } as never, 'shoutout-1')).rejects.toThrow(ConflictException);
    });
});
