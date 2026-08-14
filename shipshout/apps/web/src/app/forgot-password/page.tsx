'use client';

import { Button, Field, Heading, Input, Text, VStack } from '@chakra-ui/react';
import Link from 'next/link';
import { useState } from 'react';
import { authApi } from '@/lib/auth-api';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        await authApi.forgotPassword(email).catch(() => undefined);
        setSent(true);
        setLoading(false);
    }

    return (
        <VStack align="stretch" gap="4" maxW="md" mx="auto" minH="100vh" justify="center" px="6">
            <Heading size="lg">Forgot password</Heading>
            {sent ? (
                <Text color="fg.muted">If an account exists for that email, we sent a reset link.</Text>
            ) : (
                <form onSubmit={onSubmit}>
                    <VStack align="stretch" gap="4">
                        <Field.Root>
                            <Field.Label>Email</Field.Label>
                            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </Field.Root>
                        <Button type="submit" colorPalette="brand" loading={loading}>
                            Send reset link
                        </Button>
                    </VStack>
                </form>
            )}
            <Link href="/login">Back to sign in</Link>
        </VStack>
    );
}
