import { RepositorySimulateController } from '../../controllers/repository-simulate.controller';

describe('RepositorySimulateController', () => {
    it('delegates valid bodies to WebhooksService.simulateRelease', async () => {
        const webhooks = { simulateRelease: jest.fn(async () => ({ accepted: true, duplicate: false })) };
        const c = new RepositorySimulateController(webhooks as any);
        const res = await c.simulateRelease('w1', 'r1', { title: 'v1' });
        expect(webhooks.simulateRelease).toHaveBeenCalledWith('w1', 'r1', { title: 'v1' });
        expect(res).toEqual({ accepted: true, duplicate: false });
    });

    it('passes through optional fields when omitted', async () => {
        const webhooks = { simulateRelease: jest.fn(async () => ({ accepted: true })) };
        const c = new RepositorySimulateController(webhooks as any);
        await c.simulateRelease('w1', 'r1', {});
        expect(webhooks.simulateRelease).toHaveBeenCalledWith('w1', 'r1', {});
    });
});
