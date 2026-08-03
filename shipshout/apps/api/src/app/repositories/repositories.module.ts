import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RepositoriesController } from './repositories.controller';
import { RepositoriesService } from './repositories.service';
import { ConnectedRepoRepository } from './connected-repo.repository';

@Module({
    imports: [AuthModule],
    controllers: [RepositoriesController],
    providers: [ConnectedRepoRepository, RepositoriesService],
    exports: [RepositoriesService],
})
export class RepositoriesModule {}
