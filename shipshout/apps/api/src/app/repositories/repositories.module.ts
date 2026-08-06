import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../config/database.module';
import { BillingModule } from '../billing/billing.module';
import { RepositoriesController } from './repositories.controller';
import { GithubReposController, GithubInstallController } from './github-repos.controller';
import { GithubOAuthCallbackController } from './github-oauth-callback.controller';
import { RepositoriesService } from './repositories.service';
import { GithubReposService } from './github-repos.service';
import { ConnectedRepoRepository } from './connected-repo.repository';

@Module({
    imports: [DatabaseModule, AuthModule, forwardRef(() => BillingModule)],
    controllers: [RepositoriesController, GithubReposController, GithubInstallController, GithubOAuthCallbackController],
    providers: [ConnectedRepoRepository, RepositoriesService, GithubReposService],
    exports: [RepositoriesService, ConnectedRepoRepository, GithubReposService],
})
export class RepositoriesModule {}
