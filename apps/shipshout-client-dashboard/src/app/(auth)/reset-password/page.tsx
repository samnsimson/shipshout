import { AuthCard } from '@/components/auth/auth-card';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const params = await searchParams;
    return (
        <AuthCard title="Choose a new password">
            <ResetPasswordForm token={params.token ?? ''} />
        </AuthCard>
    );
}
