import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createRepositoryProvider, GithubConnectionEntity, LinkedRepositoryEntity } from '@shipshout/database';
import { RepositoryController } from './controllers/repository.controller';
import { GithubConnectionRepository } from './repositories/github-connection.repository';
import { LinkedRepositoryRepository } from './repositories/linked-repository.repository';
import { GithubApiService } from './services/github-api.service';
import { GithubOAuthService } from './services/github-oauth.service';
import { RepositoryService } from './services/repository.service';

@Module({
    imports: [TypeOrmModule.forFeature([GithubConnectionEntity, LinkedRepositoryEntity])],
    controllers: [RepositoryController],
    providers: [
        createRepositoryProvider(GithubConnectionRepository, GithubConnectionEntity),
        createRepositoryProvider(LinkedRepositoryRepository, LinkedRepositoryEntity),
        RepositoryService,
        GithubOAuthService,
        GithubApiService,
    ],
})
export class RepositoryModule {}
