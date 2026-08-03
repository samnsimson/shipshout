import { GenerationService } from './generation.service.js';
import { Channel, DraftStatus, Tone } from '@shipshout/database';

function deps() {
    const event = {
        id: 'e1',
        commitSummary: 'fix cache latency',
        status: 'received',
        repository: { workspace: { id: 'w1' } },
    };
    const events = {
        findOneBy: jest.fn(async () => event),
        save: jest.fn(async (e: any) => e),
    };
    const brands = {
        findForWorkspace: jest.fn(async () => ({ tone: Tone.Professional, emojiPolicy: true })),
    };
    const drafts = {
        create: (d: any) => d,
        save: jest.fn(async (d: any) => ({ id: 'd' + Math.random(), ...d })),
    };
    const engine = {
        generate: jest.fn(async () => ({
            text: 'Speed boost!',
            provider: 'openai',
            model: 'm',
            tokens: 9,
            latencyMs: 5,
        })),
    };
    return { events, brands, drafts, engine };
}

describe('GenerationService.generateForEvent', () => {
    it('creates one pending_review draft per channel with aiMeta', async () => {
        const { events, brands, drafts, engine } = deps();
        const svc = new GenerationService(engine as any, events as any, brands as any, drafts as any);
        const out = await svc.generateForEvent('e1', [Channel.X, Channel.LinkedIn]);
        expect(out).toHaveLength(2);
        expect(drafts.save).toHaveBeenCalledTimes(2);
        expect(out[0].status).toBe(DraftStatus.PendingReview);
        expect(out[0].aiMeta?.provider).toBe('openai');
    });
});
