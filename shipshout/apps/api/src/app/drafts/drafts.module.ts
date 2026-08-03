import { Module } from '@nestjs/common';
import { QueueModule } from '@shipshout/queue/module';
import { AuthModule } from '../auth/auth.module';
import { DraftsController } from './drafts.controller';
import { DraftsService } from './drafts.service';
import { DraftRepository } from './draft.repository';

@Module({
    imports: [AuthModule, QueueModule],
    controllers: [DraftsController],
    providers: [DraftRepository, DraftsService],
})
export class DraftsModule {}
