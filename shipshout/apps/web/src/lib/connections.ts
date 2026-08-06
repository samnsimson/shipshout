import { apiFetch } from './api-client';

export const listConnections = (ws: string) => apiFetch(`/workspaces/${ws}/connections`);

export const mockConnect = (ws: string, channel: string) => apiFetch(`/workspaces/${ws}/connections/${channel}/mock-connect`, { method: 'POST' });

export const connectUrl = (ws: string, channel: string) =>
    `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/workspaces/${ws}/connections/${channel}/start`;
