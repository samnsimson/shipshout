import { Module } from '@nestjs/common';
import { RepositoryController } from './controllers/repository.controller';
import { GithubConnectionRepository } from './repositories/github-connection.repository';
import { LinkedRepositoryRepository } from './repositories/linked-repository.repository';
import { GithubApiService } from './services/github-api.service';
import { GithubOAuthService } from './services/github-oauth.service';
import { RepositoryService } from './services/repository.service';

@Module({
    controllers: [RepositoryController],
    providers: [GithubConnectionRepository, LinkedRepositoryRepository, RepositoryService, GithubOAuthService, GithubApiService],
})
export class RepositoryModule {}
