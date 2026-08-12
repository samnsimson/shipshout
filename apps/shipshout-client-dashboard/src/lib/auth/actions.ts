'use server';

import { redirect } from 'next/navigation';
import { authFetch, getApiBaseUrl, parseJsonResponse, readErrorMessage } from './api';
import { AuthCookieUtils } from './auth-cookie.utils';
import type { AuthActionResult } from './cookies';

function field(formData: FormData, key: string): string {
    const value = formData.get(key);
    return typeof value === 'string' ? value.trim() : '';
}

export async function loginAction(formData: FormData): Promise<AuthActionResult> {
    const login = field(formData, 'login');
    const password = field(formData, 'password');
    if (!login || !password) return { ok: false, error: 'Login and password are required' };

    const response = await authFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ login, password }),
        redirect: 'manual',
    });
    if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location) {
            const url = new URL(location, getApiBaseUrl());
            redirect(`${url.pathname}${url.search}`);
        }
    }
    if (!response.ok) return { ok: false, error: await readErrorMessage(response) };
    await AuthCookieUtils.applyToCookieStore(response);
    redirect('/dashboard');
}

export async function registerAction(formData: FormData): Promise<AuthActionResult> {
    const name = field(formData, 'name');
    const username = field(formData, 'username');
    const email = field(formData, 'email');
    const password = field(formData, 'password');
    const displayUsername = field(formData, 'displayUsername') || undefined;
    if (!name || !username || !email || !password) return { ok: false, error: 'All fields are required' };

    const response = await authFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, username, email, password, displayUsername }),
    });
    if (!response.ok) return { ok: false, error: await readErrorMessage(response) };

    const payload = await parseJsonResponse<{ accessToken?: string | null }>(response);
    if (payload?.accessToken) {
        await AuthCookieUtils.applyToCookieStore(response);
        redirect('/dashboard');
    }
    redirect(`/verify-email?email=${encodeURIComponent(email)}`);
}

export async function forgotPasswordAction(formData: FormData): Promise<AuthActionResult> {
    const email = field(formData, 'email');
    if (!email) return { ok: false, error: 'Email is required' };

    const response = await authFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
    if (!response.ok) return { ok: false, error: await readErrorMessage(response) };
    return { ok: true };
}

export async function resendVerificationAction(formData: FormData): Promise<AuthActionResult> {
    const email = field(formData, 'email');
    if (!email) return { ok: false, error: 'Email is required' };

    const response = await authFetch('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
    if (!response.ok) return { ok: false, error: await readErrorMessage(response) };
    return { ok: true };
}

export async function resetPasswordAction(formData: FormData): Promise<AuthActionResult> {
    const token = field(formData, 'token');
    const newPassword = field(formData, 'newPassword');
    const confirmPassword = field(formData, 'confirmPassword');
    if (!token) return { ok: false, error: 'Reset token is missing' };
    if (!newPassword || newPassword.length < 8) return { ok: false, error: 'Password must be at least 8 characters' };
    if (newPassword !== confirmPassword) return { ok: false, error: 'Passwords do not match' };

    const response = await authFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
    });
    if (!response.ok) return { ok: false, error: await readErrorMessage(response) };
    return { ok: true };
}

export async function checkUsernameAction(username: string): Promise<{ available: boolean } | AuthActionResult> {
    const trimmed = username.trim();
    if (trimmed.length < 3) return { ok: false, error: 'Username must be at least 3 characters' };

    const response = await authFetch('/auth/username/available', {
        method: 'POST',
        body: JSON.stringify({ username: trimmed }),
    });
    if (!response.ok) return { ok: false, error: await readErrorMessage(response) };
    const body = await parseJsonResponse<{ available?: boolean }>(response);
    return { available: Boolean(body?.available) };
}

export async function getSessionAction(): Promise<{
    user: { id: string; email: string; name: string; username?: string | null; image?: string | null };
    accessToken?: string;
} | null> {
    const session = await fetchSessionFromApi();
    if (session) return session;

    const refreshed = await refreshAccessTokenAction();
    if (!refreshed) return null;
    return fetchSessionFromApi();
}

async function fetchSessionFromApi(): Promise<{
    user: { id: string; email: string; name: string; username?: string | null; image?: string | null };
    accessToken?: string;
} | null> {
    const response = await authFetch('/auth/session', { method: 'GET' });
    if (!response.ok) return null;
    const body = await parseJsonResponse<{
        user?: { id: string; email: string; name: string; username?: string | null; image?: string | null };
        accessToken?: string;
    }>(response);
    if (!body?.user) return null;
    return { user: body.user, accessToken: body.accessToken };
}

export async function refreshAccessTokenAction(): Promise<string | null> {
    const response = await authFetch('/auth/refresh', { method: 'POST', body: '{}' });
    if (!response.ok) return null;
    const body = await parseJsonResponse<{ accessToken?: string }>(response);
    if (body?.accessToken) await AuthCookieUtils.applyToCookieStore(response);
    return body?.accessToken ?? null;
}

export async function logoutAction(): Promise<void> {
    const response = await authFetch('/auth/logout', { method: 'POST', body: '{}' });
    if (response.ok) await AuthCookieUtils.applyToCookieStore(response);
    redirect('/login');
}
