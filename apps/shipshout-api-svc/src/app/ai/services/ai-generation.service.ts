import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiChannelVariant, AiGenerateChannelVariantsInput, AiProvider } from '../providers/ai-provider.interface';
import { OpenAiProvider } from '../providers/openai.provider';

@Injectable()
export class AiGenerationService {
    constructor(private readonly config: ConfigService) {}

    private resolveProvider(): AiProvider {
        const name = this.config.get<string>('AI_PROVIDER', 'openai');
        if (name === 'openai') return new OpenAiProvider(this.config.getOrThrow('OPENAI_API_KEY'), this.config.get('OPENAI_MODEL', 'gpt-4o'));
        throw new Error(`Unsupported AI_PROVIDER: ${name}`);
    }

    async generateVariants(input: AiGenerateChannelVariantsInput): Promise<Record<string, AiChannelVariant>> {
        const generatable = input.channels.filter((c) => c.key !== 'email_alert');
        return this.resolveProvider().generateChannelVariants({ ...input, channels: generatable });
    }
}
