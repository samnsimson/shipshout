import { Body, Controller, Get, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { WorkspaceGuard } from '@shipshout/auth';
import { Request } from 'express';
import { CreateWorkspaceDto } from '../dtos/create-workspace.dto';
import { WorkspacesService } from '../services/workspaces.service';

@Controller('workspaces')
export class WorkspacesController {
    constructor(private svc: WorkspacesService) {}

    @Get()
    list(@Req() req: Request) {
        if (!req.user) throw new UnauthorizedException();
        return this.svc.listForUser(req.user.id);
    }

    @Post()
    create(@Req() req: Request, @Body() dto: CreateWorkspaceDto) {
        if (!req.user) throw new UnauthorizedException();
        return this.svc.createForUser(req.user.id, dto);
    }

    @Get(':workspaceId')
    @UseGuards(WorkspaceGuard)
    get(@Req() req: Request) {
        return req.workspaceMembership!.workspace;
    }
}
