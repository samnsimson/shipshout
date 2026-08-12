import { Body, Controller, Delete, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, JwtUser, type JwtUserPayload } from '@shipshout/auth/guard';
import { ApiResource } from '@shipshout/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
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
    @UseGuards(JwtAuthGuard)
    @ApiResource({ operationId: 'getGithubConnection', status: 200, response: GithubConnectionResponseDto })
    getGithubConnection(@JwtUser() user: JwtUserPayload): Promise<GithubConnectionResponseDto> {
        return this.repositoryService.getGithubConnection(user.sub);
    }

    @Get('github/connect')
    @UseGuards(JwtAuthGuard)
    @ApiResource({ operationId: 'connectGithub', status: 302 })
    connectGithub(@JwtUser() user: JwtUserPayload, @Res() res: Response): void {
        res.redirect(this.repositoryService.getConnectUrl(user.sub));
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
    @UseGuards(JwtAuthGuard)
    @ApiResource({ operationId: 'disconnectGithub', status: 204 })
    async disconnectGithub(@JwtUser() user: JwtUserPayload, @Res() res: Response): Promise<void> {
        await this.repositoryService.disconnectGithub(user.sub);
        res.status(204).send();
    }

    @Get('github/available')
    @UseGuards(JwtAuthGuard)
    @ApiResource({
        operationId: 'listAvailableRepos',
        status: 200,
        response: GithubRepoListResponseDto,
        errors: [{ status: 400, description: 'GitHub is not connected' }],
    })
    listAvailableRepos(@JwtUser() user: JwtUserPayload): Promise<GithubRepoListResponseDto> {
        return this.repositoryService.listAvailableRepos(user.sub);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiResource({ operationId: 'listLinkedRepos', status: 200, response: LinkedRepositoryListResponseDto })
    listLinkedRepos(@JwtUser() user: JwtUserPayload): Promise<LinkedRepositoryListResponseDto> {
        return this.repositoryService.listLinkedRepos(user.sub);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiResource({
        operationId: 'linkRepositories',
        status: 201,
        response: LinkRepositoriesResponseDto,
        body: LinkRepositoriesDto,
        errors: [{ status: 400, description: 'GitHub is not connected or repository is inaccessible' }],
    })
    linkRepositories(@JwtUser() user: JwtUserPayload, @Body() body: LinkRepositoriesDto): Promise<LinkRepositoriesResponseDto> {
        return this.repositoryService.linkRepositories(user.sub, body);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiResource({
        operationId: 'unlinkRepository',
        status: 204,
        params: [{ name: 'id', description: 'Linked repository id' }],
        errors: [{ status: 404, description: 'Linked repository not found' }],
    })
    async unlinkRepository(@JwtUser() user: JwtUserPayload, @Param('id') id: string, @Res() res: Response): Promise<void> {
        await this.repositoryService.unlinkRepository(user.sub, id);
        res.status(204).send();
    }
}
