import { BadRequestException, Body, Controller, Get, Logger, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { WorkspaceGuard } from '@shipshout/auth';
import { z } from 'zod';
import { GithubReposService } from './github-repos.service';

const ImportGithubReposSchema = z.object({
    repoIds: z.array(z.number().int().positive()).min(1),
});

@Controller('workspaces/:workspaceId/repositories/github')
@UseGuards(WorkspaceGuard)
export class GithubReposController {
    constructor(private svc: GithubReposService) {}

    @Get('start')
    start(@Param('workspaceId') ws: string, @Res() res: Response) {
        res.redirect(this.svc.startUrl(ws));
    }

    @Get('pending')
    pending(@Param('workspaceId') ws: string, @Req() req: Request) {
        return this.svc.pendingFromSession(ws, req.session.githubRepoConnect);
    }

    @Post('import')
    async importRepos(@Param('workspaceId') ws: string, @Body() body: unknown, @Req() req: Request) {
        const parsed = ImportGithubReposSchema.safeParse(body);
        if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
        if (!req.session.githubRepoConnect) throw new BadRequestException('No pending GitHub connection');
        const result = await this.svc.importSelected(ws, req.session.githubRepoConnect, parsed.data.repoIds);
        delete req.session.githubRepoConnect;
        return result;
    }
}

@Controller('github')
export class GithubInstallController {
    private readonly log = new Logger(GithubInstallController.name);

    constructor(private svc: GithubReposService) {}

    @Get('install/callback')
    async installCallback(
        @Query('installation_id') installationId: string,
        @Query('state') workspaceId: string,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        if (!installationId || !workspaceId) throw new BadRequestException('Missing installation parameters');
        try {
            const { pending, skipped, total } = await this.svc.prepareInstallationSelection(workspaceId, installationId);
            if (pending.repos.length === 0) {
                const params = new URLSearchParams({ connected: '0', skipped: String(skipped) });
                if (total === 0) params.set('reason', 'no_access');
                return res.redirect(`${process.env.WEB_BASE_URL}/${workspaceId}/settings/repositories?${params}`);
            }
            req.session.githubRepoConnect = pending;
            return req.session.save((saveErr) => {
                if (saveErr) {
                    this.log.error(`Session save failed: ${saveErr.message}`);
                    return res.redirect(`${process.env.WEB_BASE_URL}/${workspaceId}/settings/repositories?error=connect_failed`);
                }
                res.redirect(`${process.env.WEB_BASE_URL}/${workspaceId}/settings/repositories/select`);
            });
        } catch (err) {
            this.log.error(`GitHub App install failed: ${err instanceof Error ? err.message : err}`);
            return res.redirect(`${process.env.WEB_BASE_URL}/${workspaceId}/settings/repositories?error=connect_failed`);
        }
    }
}
