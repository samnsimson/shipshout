jest.mock('@thallesp/nestjs-better-auth', () => ({
    Session: () => () => undefined,
}));

import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
    let controller: PaymentsController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PaymentsController],
            providers: [{ provide: PaymentsService, useValue: { listMine: jest.fn() } }],
        }).compile();

        controller = module.get(PaymentsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
