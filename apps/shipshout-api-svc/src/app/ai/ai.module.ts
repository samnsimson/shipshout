import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AI_PROVIDER } from './constants/ai.constants';
import { AiProvider } from './providers/ai-provider.interface';
import { OpenAiProvider } from './providers/openai.provider';
import { AiGenerationService } from './services/ai-generation.service';

@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: AI_PROVIDER,
            inject: [ConfigService],
            useFactory: (config: ConfigService): AiProvider => {
                const name = config.get<string>('AI_PROVIDER', 'openai');
                if (name === 'openai') {
                    const apiKey = config.getOrThrow<string>('OPENAI_API_KEY').trim();
                    const model = config.get<string>('OPENAI_MODEL', 'gpt-4o');
                    return new OpenAiProvider(apiKey, model);
                }
                throw new Error(`Unsupported AI_PROVIDER: ${name}`);
            },
        },
        AiGenerationService,
    ],
    exports: [AiGenerationService],
})
export class AiModule {}
