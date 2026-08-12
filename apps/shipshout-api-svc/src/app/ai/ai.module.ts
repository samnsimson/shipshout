import { Module } from '@nestjs/common';
import { AiGenerationService } from './services/ai-generation.service';

@Module({
    providers: [AiGenerationService],
    exports: [AiGenerationService],
})
export class AiModule {}
