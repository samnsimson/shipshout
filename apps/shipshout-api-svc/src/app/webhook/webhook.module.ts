import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TriggerModule } from '../trigger/trigger.module';
import { ShoutoutModule } from '../shoutout/shoutout.module';
import { GithubWebhookController } from './controllers/github-webhook.controller';
import { GithubWebhookRawBodyMiddleware } from './middleware/github-webhook-raw-body.middleware';
import { WebhookIngestService } from './services/webhook-ingest.service';

@Module({
    imports: [TriggerModule, ShoutoutModule],
    controllers: [GithubWebhookController],
    providers: [WebhookIngestService],
})
export class WebhookModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(GithubWebhookRawBodyMiddleware).forRoutes(GithubWebhookController);
    }
}
