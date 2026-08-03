import Anthropic from '@anthropic-ai/sdk';
import { AiProvider, AiPrompt, AiResult } from './ai-provider.js';

export class ClaudeProvider implements AiProvider {
    name = 'claude';
    private client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    async generate(prompt: AiPrompt, opts?: { maxTokens?: number }): Promise<AiResult> {
        const model = process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest';
        const res = await this.client.messages.create({
            model,
            max_tokens: opts?.maxTokens ?? 400,
            system: prompt.system,
            messages: [{ role: 'user', content: prompt.user }],
        });
        const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
        return {
            text,
            model,
            tokens: res.usage ? res.usage.input_tokens + res.usage.output_tokens : undefined,
        };
    }
}
