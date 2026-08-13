'use server';

import { redirect } from 'next/navigation';
import { AuthApi } from './auth.api';
import { AuthUtils } from './auth.utils';
import type { AuthActionResult, SessionUser } from './auth.utils';

export class AuthActions {
    static async login(formData: FormData): Promise<AuthActionResult> {
        const login = AuthActions.field(formData, 'login');
        const password = AuthActions.field(formData, 'password');
        if (!login || !password) return { ok: false, error: 'Login and password are required' };

        const result = await AuthApi.login({ login, password });
        const response = result.response;
        if (response && response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (location) {
                const url = new URL(location, AuthApi.apiBaseUrl());
                redirect(`${url.pathname}${url.search}`);
            }
        }
        if (result.error || !response?.ok) return { ok: false, error: AuthApi.readErrorMessage(result) };
        if (response) await AuthUtils.applyToCookieStore(response);
        redirect('/dashboard');
    }

    static async register(formData: FormData): Promise<AuthActionResult> {
        const name = AuthActions.field(formData, 'name');
        const username = AuthActions.field(formData, 'username');
        const email = AuthActions.field(formData, 'email');
        const password = AuthActions.field(formData, 'password');
        const displayUsername = AuthActions.field(formData, 'displayUsername') || undefined;
        if (!name || !username || !email || !password) return { ok: false, error: 'All fields are required' };

        const result = await AuthApi.register({ name, username, email, password, displayUsername });
        if (result.error || !result.response?.ok) return { ok: false, error: AuthApi.readErrorMessage(result) };

        if (result.data?.accessToken && result.response) {
            await AuthUtils.applyToCookieStore(result.response);
            redirect('/dashboard');
        }
        redirect(`/verify-email?email=${encodeURIComponent(email)}`);
    }

    static async forgotPassword(formData: FormData): Promise<AuthActionResult> {
        const email = AuthActions.field(formData, 'email');
        if (!email) return { ok: false, error: 'Email is required' };

        const result = await AuthApi.forgotPassword({ email });
        if (result.error || !result.response?.ok) return { ok: false, error: AuthApi.readErrorMessage(result) };
        return { ok: true };
    }

    static async resendVerification(formData: FormData): Promise<AuthActionResult> {
        const email = AuthActions.field(formData, 'email');
        if (!email) return { ok: false, error: 'Email is required' };

        const result = await AuthApi.resendVerification({ email });
        if (result.error || !result.response?.ok) return { ok: false, error: AuthApi.readErrorMessage(result) };
        return { ok: true };
    }

    static async resetPassword(formData: FormData): Promise<AuthActionResult> {
        const token = AuthActions.field(formData, 'token');
        const newPassword = AuthActions.field(formData, 'newPassword');
        const confirmPassword = AuthActions.field(formData, 'confirmPassword');
        if (!token) return { ok: false, error: 'Reset token is missing' };
        if (!newPassword || newPassword.length < 8) return { ok: false, error: 'Password must be at least 8 characters' };
        if (newPassword !== confirmPassword) return { ok: false, error: 'Passwords do not match' };

        const result = await AuthApi.resetPassword({ token, newPassword });
        if (result.error || !result.response?.ok) return { ok: false, error: AuthApi.readErrorMessage(result) };
        return { ok: true };
    }

    static async checkUsername(username: string): Promise<{ available: boolean } | AuthActionResult> {
        const trimmed = username.trim();
        if (trimmed.length < 3) return { ok: false, error: 'Username must be at least 3 characters' };

        const result = await AuthApi.checkUsername({ username: trimmed });
        if (result.error || !result.response?.ok) return { ok: false, error: AuthApi.readErrorMessage(result) };
        return { available: Boolean(result.data?.available) };
    }

    static async getSession(): Promise<{ user: SessionUser; accessToken?: string } | null> {
        const session = await AuthActions.fetchSession();
        if (session) return session;

        const refreshed = await AuthActions.refreshAccessToken();
        if (!refreshed) return null;
        return AuthActions.fetchSession();
    }

    static async refreshAccessToken(): Promise<string | null> {
        const result = await AuthApi.refresh();
        if (result.error || !result.response?.ok) return null;
        if (result.data?.accessToken && result.response) await AuthUtils.applyToCookieStore(result.response);
        return result.data?.accessToken ?? null;
    }

    static async logout(): Promise<void> {
        const result = await AuthApi.logout();
        if (result.response?.ok && result.response) await AuthUtils.applyToCookieStore(result.response);
        redirect('/login');
    }

    private static field(formData: FormData, key: string): string {
        const value = formData.get(key);
        return typeof value === 'string' ? value.trim() : '';
    }

    private static async fetchSession(): Promise<{ user: SessionUser; accessToken?: string } | null> {
        const result = await AuthApi.session();
        if (result.error || !result.response?.ok || !result.data?.user) return null;
        return { user: AuthUtils.normalizeSessionUser(result.data.user), accessToken: result.data.accessToken };
    }
}
