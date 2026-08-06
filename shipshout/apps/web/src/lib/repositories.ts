import { apiFetch } from './api-client';

export const listRepositories = (ws: string) => apiFetch(`/workspaces/${ws}/repositories`);

export const createRepository = (ws: string, dto: { provider: string; externalId: string; name: string }) =>
    apiFetch(`/workspaces/${ws}/repositories`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(dto),
    });

export const simulateRelease = (ws: string, repositoryId: string, dto: { title?: string; notes?: string }) =>
    apiFetch(`/workspaces/${ws}/repositories/${repositoryId}/simulate-release`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(dto),
    });
