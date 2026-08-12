'use client';

let accessToken: string | null = null;

export class AuthTokenStore {
    static get(): string | null {
        if (accessToken) return accessToken;
        if (typeof sessionStorage === 'undefined') return null;
        const stored = sessionStorage.getItem('auth_access_token');
        return stored?.trim() || null;
    }

    static set(token: string): void {
        accessToken = token;
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('auth_access_token', token);
    }

    static clear(): void {
        accessToken = null;
        if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('auth_access_token');
    }
}
