import { redirect } from 'next/navigation';
import { apiFetch } from './api-client';
import { isForbidden, isUnauthorized } from './forbidden';

/** Server-side: rethrow unless the error is a 403 (→ /forbidden) or 401 (→ /login). */
export function redirectOnApiAuthError(error: unknown): never {
    if (isForbidden(error)) redirect('/forbidden');
    if (isUnauthorized(error)) redirect('/login');
    throw error;
}

export async function apiFetchAuthed(path: string, init?: RequestInit) {
    try {
        return await apiFetch(path, init);
    } catch (error) {
        redirectOnApiAuthError(error);
    }
}
