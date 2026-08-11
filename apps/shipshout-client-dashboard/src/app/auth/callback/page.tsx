import { redirect } from 'next/navigation';
import { applySetCookies, authFetch, readErrorMessage } from '../../../lib/auth/api';

export default async function AuthCallbackPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const params = await searchParams;
    const token = params.token?.trim() ?? '';
    if (!token) redirect('/login');

    const response = await authFetch('/auth/one-time-token/verify', {
        method: 'POST',
        body: JSON.stringify({ token }),
    });
    if (!response.ok) {
        const message = await readErrorMessage(response);
        redirect(`/login?error=${encodeURIComponent(message)}`);
    }
    await applySetCookies(response);
    redirect('/dashboard');
}
