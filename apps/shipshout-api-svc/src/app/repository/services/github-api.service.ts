import { Injectable, UnauthorizedException } from '@nestjs/common';
import { GithubApiRepo, GithubOrgResponse, GithubRepoSummary, GithubUserResponse } from '../interfaces/github.types';

@Injectable()
export class GithubApiService {
    async getAuthenticatedUser(accessToken: string): Promise<GithubUserResponse> {
        const response = await this.request<GithubUserResponse>(accessToken, 'https://api.github.com/user');
        return response;
    }

    async listAccessibleRepos(accessToken: string): Promise<GithubRepoSummary[]> {
        const repos = new Map<number, GithubRepoSummary>();

        for await (const repo of this.paginateRepos(
            accessToken,
            'https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&sort=updated&per_page=100',
        ))
            repos.set(repo.githubId, repo);

        const orgs = await this.request<GithubOrgResponse[]>(accessToken, 'https://api.github.com/user/orgs?per_page=100');
        for (const org of orgs) {
            for await (const repo of this.paginateRepos(
                accessToken,
                `https://api.github.com/orgs/${encodeURIComponent(org.login)}/repos?sort=updated&per_page=100`,
            ))
                repos.set(repo.githubId, repo);
        }

        return [...repos.values()].sort((a, b) => a.fullName.localeCompare(b.fullName));
    }

    private async *paginateRepos(accessToken: string, initialUrl: string): AsyncGenerator<GithubRepoSummary> {
        let url: string | null = initialUrl;
        while (url) {
            const response = await fetch(url, { headers: this.headers(accessToken) });
            if (!response.ok) throw new UnauthorizedException('Failed to fetch GitHub repositories');

            const body = (await response.json()) as GithubApiRepo[];
            for (const repo of body) yield this.toSummary(repo);

            url = this.nextPageUrl(response.headers.get('link'));
        }
    }

    private async request<T>(accessToken: string, url: string): Promise<T> {
        const response = await fetch(url, { headers: this.headers(accessToken) });
        if (!response.ok) throw new UnauthorizedException('GitHub API request failed');
        return (await response.json()) as T;
    }

    private headers(accessToken: string): HeadersInit {
        return {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${accessToken}`,
            'X-GitHub-Api-Version': '2022-11-28',
        };
    }

    private nextPageUrl(linkHeader: string | null): string | null {
        if (!linkHeader) return null;
        const match = linkHeader
            .split(',')
            .map((part) => part.trim())
            .find((part) => part.endsWith('rel="next"'));
        if (!match) return null;
        return match.slice(1, match.indexOf('>;')).trim();
    }

    private toSummary(repo: GithubApiRepo): GithubRepoSummary {
        return {
            githubId: repo.id,
            fullName: repo.full_name,
            name: repo.name,
            owner: repo.owner.login,
            defaultBranch: repo.default_branch,
            private: repo.private,
            htmlUrl: repo.html_url,
        };
    }
}
