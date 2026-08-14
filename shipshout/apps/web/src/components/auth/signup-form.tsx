'use client';

import { Button, Field, Heading, Input, Text, VStack } from '@chakra-ui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authApi } from '@/lib/auth-api';
import { AuthDivider, OAuthButtons } from '@/components/auth/oauth-buttons';

export function SignupForm() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await authApi.register({ email, password, name: name || undefined });
            router.push(`/check-email?email=${encodeURIComponent(email)}`);
        } catch (err: unknown) {
            const code = (err as { code?: string }).code;
            if (code === 'EMAIL_EXISTS') setError('An account with this email already exists.');
            else setError('Could not create account. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <VStack align="stretch" gap="6" maxW="md" mx="auto" w="full" px="6" py="10">
            <VStack align="stretch" gap="2">
                <Heading size="xl" fontWeight="semibold">
                    Create account
                </Heading>
                <Text fontSize="sm" color="fg.muted">
                    Get started with ShipShout in seconds.
                </Text>
            </VStack>
            {error && (
                <Text color="fg.error" fontSize="sm">
                    {error}
                </Text>
            )}
            <form onSubmit={onSubmit}>
                <VStack align="stretch" gap="4">
                    <Field.Root>
                        <Field.Label>Name</Field.Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </Field.Root>
                    <Field.Root>
                        <Field.Label>Email</Field.Label>
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </Field.Root>
                    <Field.Root>
                        <Field.Label>Password</Field.Label>
                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                    </Field.Root>
                    <Button type="submit" size="lg" colorPalette="brand" loading={loading}>
                        Create account
                    </Button>
                </VStack>
            </form>
            <AuthDivider />
            <OAuthButtons />
            <Text fontSize="sm" color="fg.muted">
                Already have an account? <Link href="/login">Sign in</Link>
            </Text>
        </VStack>
    );
}
