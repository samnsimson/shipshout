import { apiFetch } from './api-client';

export const listWorkspaces = () => apiFetch('/workspaces');

export const createWorkspace = (name: string) =>
    apiFetch('/workspaces', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
    });
