import { Body, Controller, Delete, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResource } from '@shipshout/swagger';
import { AllowAnonymous, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { Response } from 'express';
import { GithubConnectionResponseDto } from '../dto/github-connection-response.dto';
import { GithubRepoListResponseDto } from '../dto/github-repo.dto';
import { LinkRepositoriesDto } from '../dto/link-repositories.dto';
import { LinkRepositoriesResponseDto, LinkedRepositoryListResponseDto } from '../dto/linked-repository-response.dto';
import { RepositoryService } from '../services/repository.service';

@ApiTags('repositories')
@Controller('repositories')
export class RepositoryController {
    constructor(private readonly repositoryService: RepositoryService) {}

    @Get('github/connection')
    @ApiResource({ operationId: 'getGithubConnection', status: 200, response: GithubConnectionResponseDto })
    getGithubConnection(@Session() session: UserSession): Promise<GithubConnectionResponseDto> {
        return this.repositoryService.getGithubConnection(session.user.id);
    }

    @Get('github/connect')
    @ApiResource({ operationId: 'connectGithub', status: 302 })
    connectGithub(@Session() session: UserSession, @Res() res: Response): void {
        res.redirect(this.repositoryService.getConnectUrl(session.user.id));
    }

    @Get('github/callback')
    @AllowAnonymous()
    @ApiResource({
        operationId: 'githubCallback',
        status: 302,
        queries: [
            { name: 'code', required: false },
            { name: 'state', required: false },
            { name: 'error', required: false },
        ],
    })
    async githubCallback(
        @Query('code') code: string | undefined,
        @Query('state') state: string | undefined,
        @Query('error') error: string | undefined,
        @Res() res: Response,
    ): Promise<void> {
        if (error || !code || !state) {
            res.redirect(this.repositoryService.getFailureRedirectUrl(error ?? 'missing_code'));
            return;
        }

        try {
            const redirectUrl = await this.repositoryService.completeGithubConnection(code, state);
            res.redirect(redirectUrl);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'github_connection_failed';
            res.redirect(this.repositoryService.getFailureRedirectUrl(message));
        }
    }

    @Delete('github/connection')
    @ApiResource({ operationId: 'disconnectGithub', status: 204 })
    async disconnectGithub(@Session() session: UserSession, @Res() res: Response): Promise<void> {
        await this.repositoryService.disconnectGithub(session.user.id);
        res.status(204).send();
    }

    @Get('github/available')
    @ApiResource({
        operationId: 'listAvailableRepos',
        status: 200,
        response: GithubRepoListResponseDto,
        errors: [{ status: 400, description: 'GitHub is not connected' }],
    })
    listAvailableRepos(@Session() session: UserSession): Promise<GithubRepoListResponseDto> {
        return this.repositoryService.listAvailableRepos(session.user.id);
    }

    @Get()
    @ApiResource({ operationId: 'listLinkedRepos', status: 200, response: LinkedRepositoryListResponseDto })
    listLinkedRepos(@Session() session: UserSession): Promise<LinkedRepositoryListResponseDto> {
        return this.repositoryService.listLinkedRepos(session.user.id);
    }

    @Post()
    @ApiResource({
        operationId: 'linkRepositories',
        status: 201,
        response: LinkRepositoriesResponseDto,
        body: LinkRepositoriesDto,
        errors: [{ status: 400, description: 'GitHub is not connected or repository is inaccessible' }],
    })
    linkRepositories(@Session() session: UserSession, @Body() body: LinkRepositoriesDto): Promise<LinkRepositoriesResponseDto> {
        return this.repositoryService.linkRepositories(session.user.id, body);
    }

    @Delete(':id')
    @ApiResource({
        operationId: 'unlinkRepository',
        status: 204,
        params: [{ name: 'id', description: 'Linked repository id' }],
        errors: [{ status: 404, description: 'Linked repository not found' }],
    })
    async unlinkRepository(@Session() session: UserSession, @Param('id') id: string, @Res() res: Response): Promise<void> {
        await this.repositoryService.unlinkRepository(session.user.id, id);
        res.status(204).send();
    }
}
