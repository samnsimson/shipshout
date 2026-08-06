import { BadRequestException } from '@nestjs/common';
import { RepositorySimulateController } from './repository-simulate.controller';

describe('RepositorySimulateController', () => {
    it('delegates valid bodies to WebhooksService.simulateRelease', async () => {
        const webhooks = { simulateRelease: jest.fn(async () => ({ accepted: true, duplicate: false })) };
        const c = new RepositorySimulateController(webhooks as any);
        const res = await c.simulateRelease('w1', 'r1', { title: 'v1' });
        expect(webhooks.simulateRelease).toHaveBeenCalledWith('w1', 'r1', { title: 'v1' });
        expect(res).toEqual({ accepted: true, duplicate: false });
    });

    it('rejects an invalid body', () => {
        const webhooks = { simulateRelease: jest.fn() };
        const c = new RepositorySimulateController(webhooks as any);
        expect(() => c.simulateRelease('w1', 'r1', { title: 42 })).toThrow(BadRequestException);
        expect(webhooks.simulateRelease).not.toHaveBeenCalled();
    });

    it('defaults a missing body to an empty object', async () => {
        const webhooks = { simulateRelease: jest.fn(async () => ({ accepted: true })) };
        const c = new RepositorySimulateController(webhooks as any);
        await c.simulateRelease('w1', 'r1', undefined);
        expect(webhooks.simulateRelease).toHaveBeenCalledWith('w1', 'r1', {});
    });
});
