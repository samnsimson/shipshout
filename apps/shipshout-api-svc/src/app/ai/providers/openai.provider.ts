import OpenAI from 'openai';
import { AiPromptUtils } from '../utils/ai-prompt.utils';
import { AiChannelVariant, AiGenerateChannelVariantsInput, AiProvider } from './ai-provider.interface';

export class OpenAiProvider implements AiProvider {
    private readonly client: OpenAI;

    constructor(
        apiKey: string,
        private readonly model: string,
    ) {
        this.client = new OpenAI({ apiKey });
    }

    // One chat completion per channel so each variant gets channel-specific system instructions.
    async generateChannelVariants(input: AiGenerateChannelVariantsInput): Promise<Record<string, AiChannelVariant>> {
        const variants: Record<string, AiChannelVariant> = {};

        for (const channel of input.channels) {
            const completion = await this.client.chat.completions.create({
                model: this.model,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: AiPromptUtils.buildSystemPrompt(channel.key, channel.tone) },
                    { role: 'user', content: AiPromptUtils.buildUserMessage(input.sourceSummary, input.repoFullName) },
                ],
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) throw new Error(`OpenAI returned empty content for channel ${channel.key}`);

            const parsed = JSON.parse(content) as Record<string, unknown>;
            const title = typeof parsed.title === 'string' ? parsed.title : '';
            const body = typeof parsed.body === 'string' ? parsed.body : '';
            variants[channel.key] = { title, body };
        }

        return variants;
    }
}
