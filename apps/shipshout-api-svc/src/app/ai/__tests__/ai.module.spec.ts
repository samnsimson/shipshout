import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AI_PROVIDER } from '../constants/ai.constants';
import { AiModule } from '../ai.module';
import { AiGenerationService } from '../services/ai-generation.service';
import { OpenAiProvider } from '../providers/openai.provider';

describe('AiModule', () => {
    it('wires OpenAiProvider from OPENAI_API_KEY', async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    ignoreEnvFile: true,
                    ignoreEnvVars: true,
                    load: [
                        () => ({
                            AI_PROVIDER: 'openai',
                            OPENAI_API_KEY: ' sk-test-key ',
                            OPENAI_MODEL: 'gpt-4o-mini',
                        }),
                    ],
                }),
                AiModule,
            ],
        }).compile();

        const provider = moduleRef.get(AI_PROVIDER);
        const service = moduleRef.get(AiGenerationService);

        expect(provider).toBeInstanceOf(OpenAiProvider);
        expect(service).toBeInstanceOf(AiGenerationService);
    });
});
