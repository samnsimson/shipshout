import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthUtils } from '@/lib/auth/auth.utils';

export default async function HomePage() {
    const store = await cookies();
    const session = [...AuthUtils.AUTH_TOKEN_COOKIE_NAMES, ...AuthUtils.AUTH_REFRESH_COOKIE_NAMES].some((name) => store.has(name));
    redirect(session ? '/dashboard' : '/login');
}
