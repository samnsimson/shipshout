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
import { QueueModule } from '@shipshout/queue/module';
import { buildWorkerTypeOrmOptions } from './config/typeorm.module';
import { DatabaseModule } from './config/database.module';
import { ChannelConnectionRepository } from './repositories/channel-connection.repository';
import { DispatchProcessor } from './processors/dispatch.processor';
import { GenerateProcessor } from './processors/generate.processor';
import { WorkerConnectionsService } from './services/worker-connections.service';
import { buildConnectorRegistry } from './factories/connector-registry.factory';

@Module({
    imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmModule.forRoot(buildWorkerTypeOrmOptions()), DatabaseModule, QueueModule],
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
            useFactory: () => buildConnectorRegistry(),
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
