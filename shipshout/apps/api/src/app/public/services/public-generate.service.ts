import { AiEngine } from '@shipshout/ai';
import { buildPrompt, CHANNEL_CONSTRAINTS } from '@shipshout/core-domain';
import { Tone, Channel } from '@shipshout/database';
import { RateLimiter } from '@shipshout/shared-util';

export class PublicGenerateService {
    constructor(
        private engine: AiEngine,
        private limiter: RateLimiter,
    ) {}

    async generateTweet(ip: string, releaseNotes: string): Promise<{ tweet: string }> {
        const { allowed } = await this.limiter.check(`public-tweet:${ip}`);
        if (!allowed) throw new Error('Rate limit exceeded. Please try again later.');
        const prompt = buildPrompt({ commitSummary: releaseNotes, tone: Tone.HypeStartup, emojiPolicy: true, channel: Channel.X });
        const r = await this.engine.generate(prompt, { maxTokens: 120 });
        const max = CHANNEL_CONSTRAINTS[Channel.X].maxChars ?? 280;
        return { tweet: r.text.slice(0, max) };
    }
}
