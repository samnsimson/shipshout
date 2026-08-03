import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { MembershipRepository, WorkspaceRepository } from './repositories/workspace.repository';

@Module({
    imports: [AuthModule],
    controllers: [WorkspacesController],
    providers: [WorkspaceRepository, MembershipRepository, WorkspacesService],
})
export class WorkspacesModule {}
