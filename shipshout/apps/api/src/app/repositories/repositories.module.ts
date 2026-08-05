import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../config/database.module';
import { BillingModule } from '../billing/billing.module';
import { RepositoriesController } from './repositories.controller';
import { RepositoriesService } from './repositories.service';
import { ConnectedRepoRepository } from './connected-repo.repository';

@Module({
    imports: [DatabaseModule, AuthModule, forwardRef(() => BillingModule)],
    controllers: [RepositoriesController],
    providers: [ConnectedRepoRepository, RepositoriesService],
    exports: [RepositoriesService, ConnectedRepoRepository],
})
export class RepositoriesModule {}
