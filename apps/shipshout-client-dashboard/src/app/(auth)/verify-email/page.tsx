import { Alert, Show, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { ResendVerificationForm } from '@/components/auth/resend-verification-form';
import { AuthApi } from '@/lib/auth/auth.api';

async function verifyEmailToken(token: string): Promise<{ ok: boolean; message: string }> {
    try {
        const result = await AuthApi.verifyEmail({ token });
        if (result.response?.ok) return { ok: true, message: 'Email verified. You can log in.' };
        return { ok: false, message: AuthApi.readErrorMessage(result) };
    } catch {
        return { ok: false, message: 'Could not verify email right now. Try again later.' };
    }
}

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string; email?: string }> }) {
    const params = await searchParams;
    const token = params.token?.trim() ?? '';
    const email = params.email?.trim() ?? '';

    if (!token) {
        return (
            <AuthCard title="Verify your email">
                <Stack gap="lg">
                    <Text fontSize="sm" color="fg.muted" textAlign="center">
                        Check your inbox for a verification link from Shipshout.
                    </Text>
                    <ResendVerificationForm defaultEmail={email} />
                </Stack>
            </AuthCard>
        );
    }

    const result = await verifyEmailToken(token);

    return (
        <AuthCard title="Email verification">
            <Stack gap="lg">
                <Alert.Root status={result.ok ? 'success' : 'error'} borderRadius="md">
                    <Alert.Indicator />
                    <Alert.Title>{result.message}</Alert.Title>
                </Alert.Root>
                <Show
                    when={result.ok}
                    fallback={<ResendVerificationForm defaultEmail={email} />}
                >
                    <Text textAlign="center" fontSize="sm" fontWeight="500">
                        <Link href="/login">Log in</Link>
                    </Text>
                </Show>
            </Stack>
        </AuthCard>
    );
}
