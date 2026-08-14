import { BadRequestException, Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { WorkspaceGuard } from '@shipshout/auth';
import { ImportGithubReposDto } from '../dtos/import-github-repos.dto';
import { GithubReposService } from '../services/github-repos.service';

@Controller('workspaces/:workspaceId/repositories/github')
@UseGuards(WorkspaceGuard)
export class GithubReposController {
    constructor(private svc: GithubReposService) {}

    @Get('start')
    start(@Param('workspaceId') ws: string, @Res() res: Response) {
        res.redirect(this.svc.startUrl(ws));
    }

    @Get('permissions-upgrade')
    permissionsUpgrade(@Param('workspaceId') ws: string, @Res() res: Response) {
        if (!this.svc.usesGithubApp()) throw new BadRequestException('GitHub App is not configured');
        res.redirect(this.svc.permissionsUpgradeUrl(ws));
    }

    @Get('pending')
    pending(@Param('workspaceId') ws: string, @Req() req: Request) {
        return this.svc.pendingFromSession(ws, req.session.githubRepoConnect);
    }

    @Post('import')
    async importRepos(@Param('workspaceId') ws: string, @Body() dto: ImportGithubReposDto, @Req() req: Request) {
        if (!req.session.githubRepoConnect) throw new BadRequestException('No pending GitHub connection');
        const result = await this.svc.importSelected(ws, req.session.githubRepoConnect, dto.repoIds);
        delete req.session.githubRepoConnect;
        return result;
    }
}
