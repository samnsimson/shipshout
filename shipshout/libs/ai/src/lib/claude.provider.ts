import Anthropic from '@anthropic-ai/sdk';
import { AiProvider, AiPrompt, AiResult } from './ai-provider';

export class ClaudeProvider implements AiProvider {
    name = 'claude';
    private client?: Anthropic;

    private getClient(): Anthropic {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');
        if (!this.client) this.client = new Anthropic({ apiKey });
        return this.client;
    }

    async generate(prompt: AiPrompt, opts?: { maxTokens?: number }): Promise<AiResult> {
        const model = process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest';
        const maxTokens = opts?.maxTokens ?? 400;
        const res = await this.getClient().messages.create({
            model,
            max_tokens: maxTokens,
            system: prompt.system,
            messages: [{ role: 'user', content: prompt.user }],
        });
        const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
        const tokens = res.usage ? res.usage.input_tokens + res.usage.output_tokens : undefined;
        return { text, model, tokens };
    }
}
