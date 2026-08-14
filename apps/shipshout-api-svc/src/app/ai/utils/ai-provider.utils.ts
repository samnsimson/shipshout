import { ConfigService } from '@nestjs/config';
import { AiProvider } from '../providers/ai-provider.interface';
import { OpenAiProvider } from '../providers/openai.provider';

export class AiProviderUtils {
    static getProvider(provider: string, config: ConfigService): AiProvider {
        switch (provider) {
            case 'openai':
                return this.getOpenAiProvider(config);
            default:
                throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
        }
    }

    private static getOpenAiProvider(config: ConfigService): AiProvider {
        const apiKey = config.getOrThrow<string>('OPENAI_API_KEY');
        const model = config.getOrThrow<string>('OPENAI_MODEL');
        return new OpenAiProvider(apiKey, model);
    }
}
