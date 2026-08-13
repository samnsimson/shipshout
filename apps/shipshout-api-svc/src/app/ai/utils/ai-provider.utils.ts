import { ConfigService } from '@nestjs/config';
import { AiProvider } from '../providers/ai-provider.interface';
import { OpenAiProvider } from '../providers/openai.provider';

export class AiProviderUtils {
    static getProvider(provider: string, config: ConfigService): AiProvider {
        switch (provider) {
            case 'openai': {
                const apiKey = config.getOrThrow<string>('OPENAI_API_KEY').trim();
                const model = config.get<string>('OPENAI_MODEL', 'gpt-4o');
                return new OpenAiProvider(apiKey, model);
            }
            default: {
                throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
            }
        }
    }
}
