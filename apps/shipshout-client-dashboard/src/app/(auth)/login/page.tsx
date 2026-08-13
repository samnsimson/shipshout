import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { LoginForm } from '@/components/auth/login-form';
import { AuthActions } from '@/lib/auth/auth.actions';

export default async function LoginPage() {
    const session = await AuthActions.getSession();
    if (session) redirect('/dashboard');

    return (
        <AuthCard title="Log in">
            <LoginForm />
        </AuthCard>
    );
}
