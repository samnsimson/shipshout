import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { GithubOAuthLoginService } from '../../auth/services/github-oauth-login.service';
import { GithubRepoConnectService } from '../services/github-repo-connect.service';
import { GithubReposService } from '../services/github-repos.service';

/** Handles /api/auth/github/callback for both login and repo-connect OAuth flows. */
@Controller('auth')
export class GithubOAuthCallbackController {
    constructor(
        private githubRepos: GithubReposService,
        private connect: GithubRepoConnectService,
        private login: GithubOAuthLoginService,
    ) {}

    @Get('github/callback')
    async callback(@Req() req: Request, @Res() res: Response, @Query('code') code?: string, @Query('state') state?: string) {
        const workspaceId = this.githubRepos.parseRepoOAuthState(state);
        if (workspaceId) {
            const url = await this.connect.completeOAuthConnect(req, workspaceId, code);
            return res.redirect(url);
        }
        this.login.handleCallback(req, res);
    }
}
