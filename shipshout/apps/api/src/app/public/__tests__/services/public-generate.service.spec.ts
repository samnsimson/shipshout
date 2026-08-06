import { PublicGenerateService } from '../../services/public-generate.service';

function make(allowed: boolean) {
    const engine = { generate: jest.fn(async () => ({ text: '🚀 New release!', provider: 'openai', model: 'm', latencyMs: 1 })) };
    const rl = { check: jest.fn(async () => ({ allowed, remaining: 0 })) };
    return { engine, rl, svc: new PublicGenerateService(engine as any, rl as any) };
}

describe('PublicGenerateService.generateTweet', () => {
    it('returns a tweet when under the rate limit', async () => {
        const { svc, engine } = make(true);
        const out = await svc.generateTweet('1.2.3.4', 'Refactored auth');
        expect(out.tweet).toContain('New release');
        expect(engine.generate).toHaveBeenCalled();
    });
    it('throws a rate-limit error when over the limit', async () => {
        const { svc, engine } = make(false);
        await expect(svc.generateTweet('1.2.3.4', 'x')).rejects.toThrow(/rate/i);
        expect(engine.generate).not.toHaveBeenCalled();
    });
});
