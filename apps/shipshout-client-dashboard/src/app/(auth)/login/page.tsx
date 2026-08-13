import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { LoginForm } from '@/components/auth/login-form';
import { getSession } from '@/lib/auth/auth.actions';

export default async function LoginPage() {
    const session = await getSession();
    if (session) redirect('/dashboard');

    return (
        <AuthCard title="Log in">
            <LoginForm />
        </AuthCard>
    );
}
