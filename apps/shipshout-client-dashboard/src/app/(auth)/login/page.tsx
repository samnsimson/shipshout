import { redirect } from 'next/navigation';
import { AuthCard } from '../../../components/auth/auth-card';
import { LoginForm } from '../../../components/auth/login-form';
import { getSessionAction } from '../../../lib/auth/actions';

export default async function LoginPage() {
    const session = await getSessionAction();
    if (session) redirect('/dashboard');

    return (
        <AuthCard title="Log in">
            <LoginForm />
        </AuthCard>
    );
}
