import { Alert, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { AuthCard } from '../../../components/auth/auth-card';
import { getApiBaseUrl } from '../../../lib/auth/api';

async function verifyEmailToken(token: string): Promise<{ ok: boolean; message: string }> {
    try {
        const url = `${getApiBaseUrl()}/auth-service/verify-email?token=${encodeURIComponent(token)}`;
        const response = await fetch(url, { cache: 'no-store', redirect: 'manual' });
        if (response.ok || response.status === 302 || response.status === 303) {
            return { ok: true, message: 'Email verified. You can log in.' };
        }
        return { ok: false, message: 'Verification link is invalid or expired.' };
    } catch {
        return { ok: false, message: 'Could not verify email right now. Try again later.' };
    }
}

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const params = await searchParams;
    const token = params.token?.trim() ?? '';

    if (!token) {
        return (
            <AuthCard title="Verify your email">
                <Stack gap="md">
                    <Text fontSize="sm" color="fg.muted" textAlign="center">
                        Check your inbox for a verification link from Shipshout.
                    </Text>
                    <Text textAlign="center" fontSize="sm">
                        <Link href="/login">Back to login</Link>
                    </Text>
                </Stack>
            </AuthCard>
        );
    }

    const result = await verifyEmailToken(token);

    return (
        <AuthCard title="Email verification">
            <Stack gap="md">
                <Alert.Root status={result.ok ? 'success' : 'error'} borderRadius="md">
                    <Alert.Indicator />
                    <Alert.Title>{result.message}</Alert.Title>
                </Alert.Root>
                <Text textAlign="center" fontSize="sm">
                    <Link href="/login">Log in</Link>
                </Text>
            </Stack>
        </AuthCard>
    );
}
