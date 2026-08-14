import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../config/database.module';
import { BillingModule } from '../billing/billing.module';
import { RepositoriesController } from './controllers/repositories.controller';
import { GithubReposController } from './controllers/github-repos.controller';
import { GithubInstallController } from './controllers/github-install.controller';
import { GithubOAuthCallbackController } from './controllers/github-oauth-callback.controller';
import { RepositoriesService } from './services/repositories.service';
import { GithubReposService } from './services/github-repos.service';
import { GithubRepoConnectService } from './services/github-repo-connect.service';
import { GithubInstallationSyncService } from './services/github-installation-sync.service';
import { ConnectedRepoRepository } from './repositories/connected-repo.repository';
import { ReleaseEventRepository } from '../webhooks/repositories/release-event.repository';

@Module({
    imports: [DatabaseModule, AuthModule, forwardRef(() => BillingModule)],
    controllers: [RepositoriesController, GithubReposController, GithubInstallController, GithubOAuthCallbackController],
    providers: [
        ConnectedRepoRepository,
        ReleaseEventRepository,
        GithubInstallationSyncService,
        RepositoriesService,
        GithubReposService,
        GithubRepoConnectService,
    ],
    exports: [RepositoriesService, ConnectedRepoRepository, GithubReposService, GithubInstallationSyncService],
})
export class RepositoriesModule {}
