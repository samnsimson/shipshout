import { apiFetch } from './api-client';

export const startCheckout = (ws: string, tier: string) =>
    apiFetch(`/workspaces/${ws}/billing/checkout`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tier }) });

export const openPortal = (ws: string) => apiFetch(`/workspaces/${ws}/billing/portal`, { method: 'POST' });
