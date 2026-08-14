import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { WorkspaceGuard } from '@shipshout/auth';
import { RegisterRepoDto } from '../dtos/register-repo.dto';
import { RepositoriesService } from '../services/repositories.service';

@Controller('workspaces/:workspaceId/repositories')
@UseGuards(WorkspaceGuard)
export class RepositoriesController {
    constructor(private svc: RepositoriesService) {}

    @Get()
    list(@Param('workspaceId') ws: string) {
        return this.svc.list(ws);
    }

    @Post()
    create(@Param('workspaceId') ws: string, @Body() dto: RegisterRepoDto) {
        return this.svc.create(ws, dto);
    }
}
