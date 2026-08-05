import { apiFetch } from './api-client';

export const getBrand = (ws: string) => apiFetch(`/workspaces/${ws}/brand`);

export const saveBrand = (ws: string, dto: { tone: string; customInstructions?: string; emojiPolicy: boolean }) =>
    apiFetch(`/workspaces/${ws}/brand`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(dto),
    });
