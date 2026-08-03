import { BadRequestException, Body, Controller, Get, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { WorkspaceGuard } from '@shipshout/auth';
import { CreateWorkspaceSchema } from '@shipshout/contracts';
import type { Request } from 'express';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
export class WorkspacesController {
    constructor(private svc: WorkspacesService) {}

    @Get()
    list(@Req() req: Request) {
        if (!req.user) throw new UnauthorizedException();
        return this.svc.listForUser(req.user.id);
    }

    @Post()
    create(@Req() req: Request, @Body() body: unknown) {
        if (!req.user) throw new UnauthorizedException();
        const parsed = CreateWorkspaceSchema.safeParse(body);
        if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
        return this.svc.createForUser(req.user.id, parsed.data);
    }

    @Get(':workspaceId')
    @UseGuards(WorkspaceGuard)
    get(@Req() req: Request) {
        return req.workspaceMembership!.workspace;
    }
}
