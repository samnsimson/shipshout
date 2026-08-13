import { Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER } from '../constants/ai.constants';
import { AiChannelVariant, AiGenerateChannelVariantsInput, AiProvider } from '../providers/ai-provider.interface';

@Injectable()
export class AiGenerationService {
    constructor(@Inject(AI_PROVIDER) private readonly provider: AiProvider) {}

    async generateVariants(input: AiGenerateChannelVariantsInput): Promise<Record<string, AiChannelVariant>> {
        const generatable = input.channels.filter((c) => c.key !== 'email_alert');
        return this.provider.generateChannelVariants({ ...input, channels: generatable });
    }
}
