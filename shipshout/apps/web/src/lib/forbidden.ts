import { ApiError } from './api-client';

export function isForbidden(error: unknown): boolean {
    return error instanceof ApiError && error.status === 403;
}

export function isUnauthorized(error: unknown): boolean {
    return error instanceof ApiError && error.status === 401;
}

/** Client-side: redirect to /forbidden when the API returned 403. Returns true if redirected. */
export function handleForbiddenClient(error: unknown, push: (path: string) => void): boolean {
    if (!isForbidden(error)) return false;
    push('/forbidden');
    return true;
}
