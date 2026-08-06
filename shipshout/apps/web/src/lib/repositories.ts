import { apiFetch } from './api-client';

export const listRepositories = (ws: string) => apiFetch(`/workspaces/${ws}/repositories`);

export const connectGithubUrl = (ws: string) =>
    `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/workspaces/${ws}/repositories/github/start`;

export const listPendingGithubRepos = (ws: string) => apiFetch(`/workspaces/${ws}/repositories/github/pending`);

export const importGithubRepos = (ws: string, repoIds: number[]) =>
    apiFetch(`/workspaces/${ws}/repositories/github/import`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ repoIds }),
    });

export const createRepository = (ws: string, dto: { provider: string; externalId: string; name: string }) =>
    apiFetch(`/workspaces/${ws}/repositories`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(dto),
    });
