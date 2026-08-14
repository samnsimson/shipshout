import { BadRequestException, Controller, Get, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { GithubPermissionsRequiredError, GithubRepoConnectService } from '../services/github-repo-connect.service';

@Controller('github')
export class GithubInstallController {
    constructor(private connect: GithubRepoConnectService) {}

    @Get('install/callback')
    async installCallback(
        @Query('installation_id') installationId: string,
        @Query('state') workspaceId: string,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        if (!installationId || !workspaceId) throw new BadRequestException('Missing installation parameters');
        try {
            const url = await this.connect.completeInstallConnect(req, workspaceId, installationId);
            res.redirect(url);
        } catch (err) {
            if (err instanceof GithubPermissionsRequiredError) return res.redirect(err.upgradeUrl);
            throw err;
        }
    }
}
