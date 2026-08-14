const base = () => process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

async function authFetch(path: string, init?: RequestInit) {
    const res = await fetch(`${base()}/api/auth${path}`, {
        ...init,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(body.message ?? 'Request failed'), { code: body.code, status: res.status });
    return body;
}

export const authApi = {
    register: (data: { email: string; password: string; name?: string }) =>
        authFetch('/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) => authFetch('/login', { method: 'POST', body: JSON.stringify(data) }),
    resendVerification: (email: string) => authFetch('/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }),
    forgotPassword: (email: string) => authFetch('/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (token: string, password: string) =>
        authFetch('/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
    identities: () => authFetch('/identities'),
    unlink: (provider: string) => authFetch(`/link/${provider}`, { method: 'DELETE' }),
    linkCredentials: (password: string) => authFetch('/link/credentials', { method: 'POST', body: JSON.stringify({ password }) }),
    changePassword: (currentPassword: string, newPassword: string) =>
        authFetch('/link/credentials/change', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
};

export function oauthUrl(provider: 'github' | 'google') {
    return `${base()}/api/auth/${provider}`;
}

export function linkOAuthUrl(provider: 'github' | 'google', returnTo: string) {
    return `${base()}/api/auth/link/${provider}?returnTo=${encodeURIComponent(returnTo)}`;
}
