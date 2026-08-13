'use server';

import { redirect } from 'next/navigation';
import { AuthApi } from './auth.api';
import { AuthUtils } from './auth.utils';
import type { AuthActionResult, SessionUser } from './auth.utils';

function field(formData: FormData, key: string): string {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : '';
}

async function fetchSession(): Promise<{ user: SessionUser; accessToken?: string } | null> {
    const result = await AuthApi.session();
    if (result.error || !result.response?.ok || !result.data?.user) return null;
    return { user: AuthUtils.normalizeSessionUser(result.data.user), accessToken: result.data.accessToken };
}

export async function login(formData: FormData): Promise<AuthActionResult> {
    const loginValue = field(formData, 'login');
    const password = field(formData, 'password');
    if (!loginValue || !password) return { ok: false, error: 'Login and password are required' };

    const result = await AuthApi.login({ login: loginValue, password });
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

export async function register(formData: FormData): Promise<AuthActionResult> {
    const name = field(formData, 'name');
    const username = field(formData, 'username');
    const email = field(formData, 'email');
    const password = field(formData, 'password');
    const displayUsername = field(formData, 'displayUsername') || undefined;
    if (!name || !username || !email || !password) return { ok: false, error: 'All fields are required' };

    const result = await AuthApi.register({ name, username, email, password, displayUsername });
    if (result.error || !result.response?.ok) return { ok: false, error: AuthApi.readErrorMessage(result) };

    if (result.data?.accessToken && result.response) {
        await AuthUtils.applyToCookieStore(result.response);
        redirect('/dashboard');
    }
    redirect(`/verify-email?email=${encodeURIComponent(email)}`);
}

export async function forgotPassword(formData: FormData): Promise<AuthActionResult> {
    const email = field(formData, 'email');
    if (!email) return { ok: false, error: 'Email is required' };

    const result = await AuthApi.forgotPassword({ email });
    if (result.error || !result.response?.ok) return { ok: false, error: AuthApi.readErrorMessage(result) };
    return { ok: true };
}

export async function resendVerification(formData: FormData): Promise<AuthActionResult> {
    const email = field(formData, 'email');
    if (!email) return { ok: false, error: 'Email is required' };

    const result = await AuthApi.resendVerification({ email });
    if (result.error || !result.response?.ok) return { ok: false, error: AuthApi.readErrorMessage(result) };
    return { ok: true };
}

export async function resetPassword(formData: FormData): Promise<AuthActionResult> {
    const token = field(formData, 'token');
    const newPassword = field(formData, 'newPassword');
    const confirmPassword = field(formData, 'confirmPassword');
    if (!token) return { ok: false, error: 'Reset token is missing' };
    if (!newPassword || newPassword.length < 8) return { ok: false, error: 'Password must be at least 8 characters' };
    if (newPassword !== confirmPassword) return { ok: false, error: 'Passwords do not match' };

    const result = await AuthApi.resetPassword({ token, newPassword });
    if (result.error || !result.response?.ok) return { ok: false, error: AuthApi.readErrorMessage(result) };
    return { ok: true };
}

export async function checkUsername(username: string): Promise<{ available: boolean } | AuthActionResult> {
    const trimmed = username.trim();
    if (trimmed.length < 3) return { ok: false, error: 'Username must be at least 3 characters' };

    const result = await AuthApi.checkUsername({ username: trimmed });
    if (result.error || !result.response?.ok) return { ok: false, error: AuthApi.readErrorMessage(result) };
    return { available: Boolean(result.data?.available) };
}

export async function getSession(): Promise<{ user: SessionUser; accessToken?: string } | null> {
    const session = await fetchSession();
    if (session) return session;

    const refreshed = await refreshAccessToken();
    if (!refreshed) return null;
    return fetchSession();
}

export async function refreshAccessToken(): Promise<string | null> {
    const result = await AuthApi.refresh();
    if (result.error || !result.response?.ok) return null;
    if (result.data?.accessToken && result.response) await AuthUtils.applyToCookieStore(result.response);
    return result.data?.accessToken ?? null;
}

export async function logout(): Promise<void> {
    const result = await AuthApi.logout();
    if (result.response?.ok && result.response) await AuthUtils.applyToCookieStore(result.response);
    redirect('/login');
}
