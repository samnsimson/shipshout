import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  BrandProfile,
  ChannelConnection,
  Draft,
  PublishRecord,
  ReleaseEvent,
} from '@shipshout/data-entities';
import {
  AiEngine,
  ClaudeProvider,
  GenerationService,
  OpenAiProvider,
} from '@shipshout/ai';
import { ConnectorRegistry, DispatchService, CONNECTIONS_PORT } from '@shipshout/integrations-core';
import { XConnector } from '@shipshout/integrations-x';
import { LinkedInConnector } from '@shipshout/integrations-linkedin';
import { EmailConnector } from '@shipshout/integrations-email';
import { BufferConnector } from '@shipshout/integrations-buffer';
import { MailchimpConnector } from '@shipshout/integrations-mailchimp';
import { QueueModule } from '@shipshout/queue/module';
import { buildWorkerTypeOrmOptions } from './config/typeorm.module';
import { DispatchProcessor } from './dispatch.processor';
import { GenerateProcessor } from './generate.processor';
import { WorkerConnectionsService } from './worker-connections.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(buildWorkerTypeOrmOptions()),
    TypeOrmModule.forFeature([
      ReleaseEvent,
      BrandProfile,
      Draft,
      PublishRecord,
      ChannelConnection,
    ]),
    QueueModule,
  ],
  providers: [
    {
      provide: AiEngine,
      useFactory: () => new AiEngine(new OpenAiProvider(), new ClaudeProvider()),
    },
    GenerationService,
    GenerateProcessor,
    {
      provide: ConnectorRegistry,
      useFactory: () =>
        new ConnectorRegistry([
          new XConnector(),
          new LinkedInConnector(),
          new EmailConnector(),
          new BufferConnector(),
          new MailchimpConnector(),
        ]),
    },
    WorkerConnectionsService,
    { provide: CONNECTIONS_PORT, useExisting: WorkerConnectionsService },
    DispatchService,
    DispatchProcessor,
  ],
})
export class AppModule {}
