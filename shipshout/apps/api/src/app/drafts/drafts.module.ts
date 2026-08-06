import { Module } from '@nestjs/common';
import { QueueModule } from '@shipshout/queue/module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../config/database.module';
import { DraftsController } from './controllers/drafts.controller';
import { DraftsService } from './services/drafts.service';
import { DraftRepository } from './repositories/draft.repository';

@Module({
    imports: [DatabaseModule, AuthModule, QueueModule],
    controllers: [DraftsController],
    providers: [DraftRepository, DraftsService],
})
export class DraftsModule {}
