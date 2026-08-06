import { apiFetch } from './api-client';

export const listConnections = (ws: string) => apiFetch(`/workspaces/${ws}/connections`);

export const connectUrl = (ws: string, channel: string) =>
    `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/workspaces/${ws}/connections/${channel}/start`;

export const connectEmail = (ws: string, apiKey: string) =>
    apiFetch(`/workspaces/${ws}/connections/email/connect`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apiKey }),
    });

export const disconnectEmail = (ws: string) => apiFetch(`/workspaces/${ws}/connections/email`, { method: 'DELETE' });

export const connectionsConfig = (ws: string) => apiFetch(`/workspaces/${ws}/connections/config`);
