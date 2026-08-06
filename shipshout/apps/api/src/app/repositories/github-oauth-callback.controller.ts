import { Controller, Get, Logger, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import passport from 'passport';
import { GithubReposService } from './github-repos.service';

function loginRedirect(res: Response, error?: string) {
    const base = process.env.WEB_BASE_URL ?? 'http://localhost:4200';
    const url = error ? `${base}/login?error=${encodeURIComponent(error)}` : base;
    res.redirect(url);
}

/** Handles /api/auth/github/callback for both login and repo-connect OAuth flows. */
@Controller('auth')
export class GithubOAuthCallbackController {
    private readonly log = new Logger(GithubOAuthCallbackController.name);

    constructor(private githubRepos: GithubReposService) {}

    @Get('github/callback')
    async callback(@Req() req: Request, @Res() res: Response, @Query('code') code?: string, @Query('state') state?: string) {
        const workspaceId = this.githubRepos.parseRepoOAuthState(state);
        if (workspaceId) {
            if (!code) return res.redirect(`${process.env.WEB_BASE_URL}/${workspaceId}/settings/repositories?error=connect_failed`);
            try {
                const { pending, skipped, total } = await this.githubRepos.prepareOAuthSelection(workspaceId, code);
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
                this.log.error(`GitHub repo connect failed: ${err instanceof Error ? err.message : err}`);
                return res.redirect(`${process.env.WEB_BASE_URL}/${workspaceId}/settings/repositories?error=connect_failed`);
            }
        }

        passport.authenticate('github', (err: Error | null, user?: { id: string }) => {
            if (err) {
                this.log.error(`GitHub auth failed: ${err.message}`);
                return loginRedirect(res, 'github_auth_failed');
            }
            if (!user) return loginRedirect(res, 'github_auth_failed');
            req.session.userId = user.id;
            req.session.save((saveErr) => {
                if (saveErr) {
                    this.log.error(`Session save failed: ${saveErr.message}`);
                    return loginRedirect(res, 'session_failed');
                }
                loginRedirect(res);
            });
        })(req, res);
    }
}
