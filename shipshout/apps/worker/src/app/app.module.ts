import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandProfile, Draft, ReleaseEvent } from '@shipshout/data-entities';
import {
  AiEngine,
  ClaudeProvider,
  GenerationService,
  OpenAiProvider,
} from '@shipshout/ai';
import { QueueModule } from '@shipshout/queue/module';
import { buildWorkerTypeOrmOptions } from './config/typeorm.module';
import { GenerateProcessor } from './generate.processor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(buildWorkerTypeOrmOptions()),
    TypeOrmModule.forFeature([ReleaseEvent, BrandProfile, Draft]),
    QueueModule,
  ],
  providers: [
    {
      provide: AiEngine,
      useFactory: () => new AiEngine(new OpenAiProvider(), new ClaudeProvider()),
    },
    GenerationService,
    GenerateProcessor,
  ],
})
export class AppModule {}
