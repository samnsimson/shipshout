import OpenAI from 'openai';
import { AiProvider, AiPrompt, AiResult } from './ai-provider';

export class OpenAiProvider implements AiProvider {
    name = 'openai';
    private client?: OpenAI;

    private getClient(): OpenAI {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
        if (!this.client) this.client = new OpenAI({ apiKey });
        return this.client;
    }

    async generate(prompt: AiPrompt, opts?: { maxTokens?: number }): Promise<AiResult> {
        const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
        const res = await this.getClient().chat.completions.create({
            model,
            max_tokens: opts?.maxTokens ?? 400,
            messages: [
                { role: 'system', content: prompt.system },
                { role: 'user', content: prompt.user },
            ],
        });
        return { text: res.choices[0]?.message?.content ?? '', model, tokens: res.usage?.total_tokens };
    }
}
