import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
    AiEngine,
    ClaudeProvider,
    GenerationService,
    OpenAiProvider,
    ReleaseEventRepository,
    BrandProfileRepository,
    DraftRepository as GenerationDraftRepository,
} from '@shipshout/ai';
import {
    ConnectorRegistry,
    DispatchService,
    CONNECTIONS_PORT,
    DraftRepository as DispatchDraftRepository,
    PublishRecordRepository,
} from '@shipshout/integrations-core';
import { XConnector } from '@shipshout/integrations-x';
import { LinkedInConnector } from '@shipshout/integrations-linkedin';
import { EmailConnector } from '@shipshout/integrations-email';
import { BufferConnector } from '@shipshout/integrations-buffer';
import { MailchimpConnector } from '@shipshout/integrations-mailchimp';
import { QueueModule } from '@shipshout/queue/module';
import { buildWorkerTypeOrmOptions } from './config/typeorm.module';
import { DatabaseModule } from './config/database.module';
import { ChannelConnectionRepository } from './channel-connection.repository';
import { DispatchProcessor } from './dispatch.processor';
import { GenerateProcessor } from './generate.processor';
import { WorkerConnectionsService } from './worker-connections.service';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot(buildWorkerTypeOrmOptions()),
        DatabaseModule,
        QueueModule,
    ],
    providers: [
        {
            provide: AiEngine,
            useFactory: () => new AiEngine(new OpenAiProvider(), new ClaudeProvider()),
        },
        ReleaseEventRepository,
        BrandProfileRepository,
        GenerationDraftRepository,
        GenerationService,
        GenerateProcessor,
        {
            provide: ConnectorRegistry,
            useFactory: () =>
                new ConnectorRegistry([new XConnector(), new LinkedInConnector(), new EmailConnector(), new BufferConnector(), new MailchimpConnector()]),
        },
        ChannelConnectionRepository,
        WorkerConnectionsService,
        { provide: CONNECTIONS_PORT, useExisting: WorkerConnectionsService },
        DispatchDraftRepository,
        PublishRecordRepository,
        DispatchService,
        DispatchProcessor,
    ],
})
export class AppModule {}
