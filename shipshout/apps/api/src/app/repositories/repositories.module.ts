import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../config/database.module';
import { BillingModule } from '../billing/billing.module';
import { RepositoriesController } from './controllers/repositories.controller';
import { GithubReposController, GithubInstallController } from './controllers/github-repos.controller';
import { GithubOAuthCallbackController } from './controllers/github-oauth-callback.controller';
import { RepositoriesService } from './services/repositories.service';
import { GithubReposService } from './services/github-repos.service';
import { ConnectedRepoRepository } from './repositories/connected-repo.repository';

@Module({
    imports: [DatabaseModule, AuthModule, forwardRef(() => BillingModule)],
    controllers: [RepositoriesController, GithubReposController, GithubInstallController, GithubOAuthCallbackController],
    providers: [ConnectedRepoRepository, RepositoriesService, GithubReposService],
    exports: [RepositoriesService, ConnectedRepoRepository, GithubReposService],
})
export class RepositoriesModule {}
