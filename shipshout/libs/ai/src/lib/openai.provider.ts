import OpenAI from 'openai';
import { AiProvider, AiPrompt, AiResult } from './ai-provider.js';

export class OpenAiProvider implements AiProvider {
  name = 'openai';
  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  async generate(prompt: AiPrompt, opts?: { maxTokens?: number }): Promise<AiResult> {
    const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    const res = await this.client.chat.completions.create({
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
