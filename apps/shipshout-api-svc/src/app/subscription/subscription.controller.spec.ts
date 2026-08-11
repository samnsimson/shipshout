jest.mock('@thallesp/nestjs-better-auth', () => ({
    Session: () => () => undefined,
}));

import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionController', () => {
    let controller: SubscriptionController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SubscriptionController],
            providers: [
                {
                    provide: SubscriptionService,
                    useValue: {
                        listPlans: jest.fn(),
                        getMe: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get(SubscriptionController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
