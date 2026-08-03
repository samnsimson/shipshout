import { AiEngine } from './ai-engine.js';

const ok = (name: string) => ({
    name,
    generate: jest.fn(async () => ({ text: `from ${name}`, model: 'm', tokens: 10 })),
});
const bad = (name: string) => ({
    name,
    generate: jest.fn(async () => {
        throw new Error('boom');
    }),
});

describe('AiEngine failover', () => {
    it('uses default provider when it succeeds', async () => {
        const engine = new AiEngine(ok('openai') as any, ok('claude') as any);
        const r = await engine.generate({ system: 's', user: 'u' });
        expect(r.provider).toBe('openai');
        expect(r.text).toBe('from openai');
        expect(r.latencyMs).toBeGreaterThanOrEqual(0);
    });
    it('falls back when default fails', async () => {
        const engine = new AiEngine(bad('openai') as any, ok('claude') as any);
        const r = await engine.generate({ system: 's', user: 'u' });
        expect(r.provider).toBe('claude');
    });
    it('throws when both fail', async () => {
        const engine = new AiEngine(bad('openai') as any, bad('claude') as any);
        await expect(engine.generate({ system: 's', user: 'u' })).rejects.toThrow();
    });
});
