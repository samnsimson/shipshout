'use server';

import { redirect } from 'next/navigation';
import { AuthApi } from './auth.api';
import { AuthUtils } from './auth.utils';
import type { AuthActionResult } from './auth.utils';

export class AuthActions {
    static async login(formData: FormData): Promise<AuthActionResult> {
        const login = AuthActions.field(formData, 'login');
        const password = AuthActions.field(formData, 'password');
        if (!login || !password) return { ok: false, error: 'Login and password are required' };

        const response = await AuthApi.fetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ login, password }),
            redirect: 'manual',
        });
        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (location) {
                const url = new URL(location, AuthApi.apiBaseUrl());
                redirect(`${url.pathname}${url.search}`);
            }
        }
        if (!response.ok) return { ok: false, error: await AuthApi.readErrorMessage(response) };
        await AuthUtils.applyToCookieStore(response);
        redirect('/dashboard');
    }

    static async register(formData: FormData): Promise<AuthActionResult> {
        const name = AuthActions.field(formData, 'name');
        const username = AuthActions.field(formData, 'username');
        const email = AuthActions.field(formData, 'email');
        const password = AuthActions.field(formData, 'password');
        const displayUsername = AuthActions.field(formData, 'displayUsername') || undefined;
        if (!name || !username || !email || !password) return { ok: false, error: 'All fields are required' };

        const response = await AuthApi.fetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, username, email, password, displayUsername }),
        });
        if (!response.ok) return { ok: false, error: await AuthApi.readErrorMessage(response) };

        const payload = await AuthApi.parseJsonResponse<{ accessToken?: string | null }>(response);
        if (payload?.accessToken) {
            await AuthUtils.applyToCookieStore(response);
            redirect('/dashboard');
        }
        redirect(`/verify-email?email=${encodeURIComponent(email)}`);
    }

    static async forgotPassword(formData: FormData): Promise<AuthActionResult> {
        const email = AuthActions.field(formData, 'email');
        if (!email) return { ok: false, error: 'Email is required' };

        const response = await AuthApi.fetch('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
        if (!response.ok) return { ok: false, error: await AuthApi.readErrorMessage(response) };
        return { ok: true };
    }

    static async resendVerification(formData: FormData): Promise<AuthActionResult> {
        const email = AuthActions.field(formData, 'email');
        if (!email) return { ok: false, error: 'Email is required' };

        const response = await AuthApi.fetch('/auth/resend-verification', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
        if (!response.ok) return { ok: false, error: await AuthApi.readErrorMessage(response) };
        return { ok: true };
    }

    static async resetPassword(formData: FormData): Promise<AuthActionResult> {
        const token = AuthActions.field(formData, 'token');
        const newPassword = AuthActions.field(formData, 'newPassword');
        const confirmPassword = AuthActions.field(formData, 'confirmPassword');
        if (!token) return { ok: false, error: 'Reset token is missing' };
        if (!newPassword || newPassword.length < 8) return { ok: false, error: 'Password must be at least 8 characters' };
        if (newPassword !== confirmPassword) return { ok: false, error: 'Passwords do not match' };

        const response = await AuthApi.fetch('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, newPassword }),
        });
        if (!response.ok) return { ok: false, error: await AuthApi.readErrorMessage(response) };
        return { ok: true };
    }

    static async checkUsername(username: string): Promise<{ available: boolean } | AuthActionResult> {
        const trimmed = username.trim();
        if (trimmed.length < 3) return { ok: false, error: 'Username must be at least 3 characters' };

        const response = await AuthApi.fetch('/auth/username/available', {
            method: 'POST',
            body: JSON.stringify({ username: trimmed }),
        });
        if (!response.ok) return { ok: false, error: await AuthApi.readErrorMessage(response) };
        const body = await AuthApi.parseJsonResponse<{ available?: boolean }>(response);
        return { available: Boolean(body?.available) };
    }

    static async getSession(): Promise<{
        user: { id: string; email: string; name: string; username?: string | null; image?: string | null };
        accessToken?: string;
    } | null> {
        const session = await AuthActions.fetchSession();
        if (session) return session;

        const refreshed = await AuthActions.refreshAccessToken();
        if (!refreshed) return null;
        return AuthActions.fetchSession();
    }

    static async refreshAccessToken(): Promise<string | null> {
        const response = await AuthApi.fetch('/auth/refresh', { method: 'POST', body: '{}' });
        if (!response.ok) return null;
        const body = await AuthApi.parseJsonResponse<{ accessToken?: string }>(response);
        if (body?.accessToken) await AuthUtils.applyToCookieStore(response);
        return body?.accessToken ?? null;
    }

    static async logout(): Promise<void> {
        const response = await AuthApi.fetch('/auth/logout', { method: 'POST', body: '{}' });
        if (response.ok) await AuthUtils.applyToCookieStore(response);
        redirect('/login');
    }

    private static field(formData: FormData, key: string): string {
        const value = formData.get(key);
        return typeof value === 'string' ? value.trim() : '';
    }

    private static async fetchSession(): Promise<{
        user: { id: string; email: string; name: string; username?: string | null; image?: string | null };
        accessToken?: string;
    } | null> {
        const response = await AuthApi.fetch('/auth/session', { method: 'GET' });
        if (!response.ok) return null;
        const body = await AuthApi.parseJsonResponse<{
            user?: { id: string; email: string; name: string; username?: string | null; image?: string | null };
            accessToken?: string;
        }>(response);
        if (!body?.user) return null;
        return { user: body.user, accessToken: body.accessToken };
    }
}
