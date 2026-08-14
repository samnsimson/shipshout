'use client';

import { Button, Heading, Text, VStack } from '@chakra-ui/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/auth-api';

export function CheckEmailContent() {
    const params = useSearchParams();
    const email = params.get('email') ?? '';

    return (
        <VStack align="stretch" gap="4" maxW="md" mx="auto" minH="100vh" justify="center" px="6">
            <Heading size="lg">Check your email</Heading>
            <Text color="fg.muted">
                We sent a verification link to {email || 'your email'}. Click it to activate your account before signing in.
            </Text>
            {email && (
                <Button variant="outline" onClick={() => authApi.resendVerification(email)}>
                    Resend verification email
                </Button>
            )}
            <Link href="/login">Back to sign in</Link>
        </VStack>
    );
}
