import { Body, Controller, Delete, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
import { GithubConnectionResponseDto } from '../dto/github-connection-response.dto';
import { GithubRepoListResponseDto } from '../dto/github-repo.dto';
import { LinkRepositoriesDto } from '../dto/link-repositories.dto';
import {
    LinkRepositoriesResponseDto,
    LinkedRepositoryListResponseDto,
} from '../dto/linked-repository-response.dto';
import { RepositoryService } from '../services/repository.service';

@ApiTags('repositories')
@Controller('repositories')
export class RepositoryController {
    constructor(private readonly repositoryService: RepositoryService) {}

    @Get('github/connection')
    @ApiOperation({ summary: 'GitHub connection status for the current user' })
    @ApiResponse({ status: 200, type: GithubConnectionResponseDto })
    getGithubConnection(@Session() session: UserSession): Promise<GithubConnectionResponseDto> {
        return this.repositoryService.getGithubConnection(session.user.id);
    }

    @Get('github/connect')
    @ApiOperation({ summary: 'Start GitHub OAuth to grant repository access' })
    @ApiResponse({ status: 302, description: 'Redirect to GitHub authorization' })
    connectGithub(@Session() session: UserSession, @Res() res: Response): void {
        res.redirect(this.repositoryService.getConnectUrl(session.user.id));
    }

    @Get('github/callback')
    @AllowAnonymous()
    @ApiOperation({ summary: 'GitHub OAuth callback for repository access' })
    @ApiQuery({ name: 'code', required: false })
    @ApiQuery({ name: 'state', required: false })
    @ApiQuery({ name: 'error', required: false })
    @ApiResponse({ status: 302, description: 'Redirect back to the dashboard' })
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
    @ApiOperation({ summary: 'Disconnect GitHub repository access' })
    @ApiResponse({ status: 204, description: 'GitHub disconnected' })
    async disconnectGithub(@Session() session: UserSession, @Res() res: Response): Promise<void> {
        await this.repositoryService.disconnectGithub(session.user.id);
        res.status(204).send();
    }

    @Get('github/available')
    @ApiOperation({ summary: 'List GitHub repositories available to link' })
    @ApiResponse({ status: 200, type: GithubRepoListResponseDto })
    @ApiResponse({ status: 400, description: 'GitHub is not connected' })
    listAvailableRepos(@Session() session: UserSession): Promise<GithubRepoListResponseDto> {
        return this.repositoryService.listAvailableRepos(session.user.id);
    }

    @Get()
    @ApiOperation({ summary: 'List repositories linked to the current user' })
    @ApiResponse({ status: 200, type: LinkedRepositoryListResponseDto })
    listLinkedRepos(@Session() session: UserSession): Promise<LinkedRepositoryListResponseDto> {
        return this.repositoryService.listLinkedRepos(session.user.id);
    }

    @Post()
    @ApiOperation({ summary: 'Link selected GitHub repositories' })
    @ApiBody({ type: LinkRepositoriesDto })
    @ApiResponse({ status: 201, type: LinkRepositoriesResponseDto })
    @ApiResponse({ status: 400, description: 'GitHub is not connected or repository is inaccessible' })
    linkRepositories(@Session() session: UserSession, @Body() body: LinkRepositoriesDto): Promise<LinkRepositoriesResponseDto> {
        return this.repositoryService.linkRepositories(session.user.id, body);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Unlink a repository' })
    @ApiParam({ name: 'id', description: 'Linked repository id' })
    @ApiResponse({ status: 204, description: 'Repository unlinked' })
    @ApiResponse({ status: 404, description: 'Linked repository not found' })
    async unlinkRepository(@Session() session: UserSession, @Param('id') id: string, @Res() res: Response): Promise<void> {
        await this.repositoryService.unlinkRepository(session.user.id, id);
        res.status(204).send();
    }
}
