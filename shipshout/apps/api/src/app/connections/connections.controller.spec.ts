import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Channel } from '@shipshout/database';
import { ConnectionsController } from './connections.controller';

describe('ConnectionsController.mockConnect', () => {
    const originalEnv = process.env.MOCK_CHANNELS;
    afterEach(() => {
        process.env.MOCK_CHANNELS = originalEnv;
    });

    it('saves a fake active connection when MOCK_CHANNELS is enabled', async () => {
        process.env.MOCK_CHANNELS = 'true';
        const svc = { saveTokens: jest.fn(async () => ({ id: 'c1' })) };
        const c = new ConnectionsController(svc as any);
        const res = await c.mockConnect('w1', 'x');
        expect(svc.saveTokens).toHaveBeenCalledWith('w1', Channel.X, { accessToken: 'mock-token', externalAccountId: 'mock' });
        expect(res).toEqual({ connected: true });
    });

    it('404s when MOCK_CHANNELS is disabled', async () => {
        process.env.MOCK_CHANNELS = 'false';
        const svc = { saveTokens: jest.fn() };
        const c = new ConnectionsController(svc as any);
        await expect(c.mockConnect('w1', 'x')).rejects.toThrow(NotFoundException);
        expect(svc.saveTokens).not.toHaveBeenCalled();
    });

    it('400s for an unknown channel', async () => {
        process.env.MOCK_CHANNELS = 'true';
        const svc = { saveTokens: jest.fn() };
        const c = new ConnectionsController(svc as any);
        await expect(c.mockConnect('w1', 'not-a-channel')).rejects.toThrow(BadRequestException);
    });
});
