import { apiFetch } from './api-client';

export const listDrafts = (ws: string) => apiFetch(`/workspaces/${ws}/drafts`);

export const updateDraft = (ws: string, id: string, editedCopy: string) =>
    apiFetch(`/workspaces/${ws}/drafts/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ editedCopy }),
    });

export const approveDraft = (ws: string, id: string) => apiFetch(`/workspaces/${ws}/drafts/${id}/approve`, { method: 'POST' });

export const publishDraft = (ws: string, id: string) => apiFetch(`/workspaces/${ws}/drafts/${id}/publish`, { method: 'POST' });
