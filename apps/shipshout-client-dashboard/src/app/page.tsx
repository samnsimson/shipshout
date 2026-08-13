import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_REFRESH_COOKIE_NAMES, AUTH_TOKEN_COOKIE_NAMES } from '@/lib/auth/cookies';

export default async function HomePage() {
    const store = await cookies();
    const session = [...AUTH_TOKEN_COOKIE_NAMES, ...AUTH_REFRESH_COOKIE_NAMES].some((name) => store.has(name));
    redirect(session ? '/dashboard' : '/login');
}
