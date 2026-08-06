'use client';

import { Button, Field, Heading, Input, Text, VStack } from '@chakra-ui/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { authApi } from '@/lib/auth-api';

export function ResetPasswordContent() {
    const params = useSearchParams();
    const router = useRouter();
    const token = params.get('token') ?? '';
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await authApi.resetPassword(token, password);
            router.push('/login?reset=1');
        } catch {
            setError('Invalid or expired reset link.');
        } finally {
            setLoading(false);
        }
    }

    if (!token) {
        return (
            <VStack align="stretch" gap="4" maxW="md" mx="auto" minH="100vh" justify="center" px="6">
                <Text color="fg.error">Missing reset token.</Text>
                <Link href="/forgot-password">Request a new link</Link>
            </VStack>
        );
    }

    return (
        <VStack align="stretch" gap="4" maxW="md" mx="auto" minH="100vh" justify="center" px="6">
            <Heading size="lg">Reset password</Heading>
            {error && <Text color="fg.error">{error}</Text>}
            <form onSubmit={onSubmit}>
                <VStack align="stretch" gap="4">
                    <Field.Root>
                        <Field.Label>New password</Field.Label>
                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                    </Field.Root>
                    <Field.Root>
                        <Field.Label>Confirm password</Field.Label>
                        <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
                    </Field.Root>
                    <Button type="submit" colorPalette="brand" loading={loading}>
                        Update password
                    </Button>
                </VStack>
            </form>
        </VStack>
    );
}
