import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { WorkspaceGuard } from '@shipshout/auth';
import { RegisterRepoSchema } from '@shipshout/contracts';
import { RepositoriesService } from './repositories.service';

@Controller('workspaces/:workspaceId/repositories')
@UseGuards(WorkspaceGuard)
export class RepositoriesController {
    constructor(private svc: RepositoriesService) {}

    @Get()
    list(@Param('workspaceId') ws: string) {
        return this.svc.list(ws);
    }

    @Post()
    create(@Param('workspaceId') ws: string, @Body() body: unknown) {
        const parsed = RegisterRepoSchema.safeParse(body);
        if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
        return this.svc.create(ws, parsed.data);
    }
}
