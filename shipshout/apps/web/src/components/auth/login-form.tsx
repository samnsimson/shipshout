'use client';

import { Button, Field, Heading, Input, Text, VStack } from '@chakra-ui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authApi } from '@/lib/auth-api';
import { AuthDivider, OAuthButtons } from '@/components/auth/oauth-buttons';

export function LoginForm({ error, verified, reset }: { error?: string; verified?: boolean; reset?: boolean }) {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setFormError(null);
        try {
            await authApi.login({ email, password });
            router.push('/');
            router.refresh();
        } catch (err: unknown) {
            const code = (err as { code?: string }).code;
            if (code === 'EMAIL_NOT_VERIFIED') setFormError('Verify your email before signing in.');
            else setFormError('Invalid email or password.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <VStack align="stretch" gap="6" maxW="md" mx="auto" w="full" px="6" py="10">
            <VStack align="stretch" gap="2">
                <Heading size="xl" fontWeight="semibold">
                    Sign in
                </Heading>
                <Text fontSize="sm" color="fg.muted">
                    Sign in with GitHub, Google, or your email.
                </Text>
            </VStack>
            {verified && (
                <Text color="fg.success" fontSize="sm">
                    Email verified — you can sign in now.
                </Text>
            )}
            {reset && (
                <Text color="fg.success" fontSize="sm">
                    Password updated — sign in with your new password.
                </Text>
            )}
            {error && (
                <Text color="fg.error" fontSize="sm">
                    Sign-in failed. Please try again.
                </Text>
            )}
            {formError && (
                <Text color="fg.error" fontSize="sm">
                    {formError}
                    {formError.includes('Verify') && (
                        <>
                            {' '}
                            <Button
                                variant="plain"
                                size="sm"
                                onClick={() => authApi.resendVerification(email).catch(() => undefined)}
                            >
                                Resend verification
                            </Button>
                        </>
                    )}
                </Text>
            )}
            <OAuthButtons />
            <AuthDivider />
            <form onSubmit={onSubmit}>
                <VStack align="stretch" gap="4">
                    <Field.Root>
                        <Field.Label>Email</Field.Label>
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </Field.Root>
                    <Field.Root>
                        <Field.Label>Password</Field.Label>
                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                    </Field.Root>
                    <Button type="submit" size="lg" colorPalette="brand" loading={loading}>
                        Sign in
                    </Button>
                </VStack>
            </form>
            <Text fontSize="sm" color="fg.muted">
                <Link href="/forgot-password">Forgot password?</Link>
            </Text>
            <Text fontSize="sm" color="fg.muted">
                Don&apos;t have an account? <Link href="/signup">Sign up</Link>
            </Text>
        </VStack>
    );
}
