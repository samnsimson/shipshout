import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE_NAMES } from '../lib/auth/cookies';

export default async function HomePage() {
    const store = await cookies();
    const session = SESSION_COOKIE_NAMES.some((name) => store.has(name));
    redirect(session ? '/dashboard' : '/login');
}
