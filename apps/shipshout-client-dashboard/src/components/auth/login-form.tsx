'use client';

import { Alert, Button, Field, Input, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { loginAction } from '../../lib/auth/actions';
import { SocialButtons } from './social-buttons';

export function LoginForm() {
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    return (
        <form
            action={(formData) =>
                startTransition(async () => {
                    setError(null);
                    const result = await loginAction(formData);
                    if (result && !result.ok) setError(result.error);
                })
            }
        >
            <Stack gap="md">
                <SocialButtons />
                {error ? (
                    <Alert.Root status="error" borderRadius="md">
                        <Alert.Indicator />
                        <Alert.Title>{error}</Alert.Title>
                    </Alert.Root>
                ) : null}
                <Field.Root required>
                    <Field.Label fontSize="sm">Email or username</Field.Label>
                    <Input name="login" autoComplete="username" borderRadius="xs" bg="bg.surface" />
                </Field.Root>
                <Field.Root required>
                    <Field.Label fontSize="sm">Password</Field.Label>
                    <Input name="password" type="password" autoComplete="current-password" borderRadius="xs" bg="bg.surface" />
                </Field.Root>
                <Button type="submit" loading={pending} bg="brand.solid" color="white" borderRadius="full" _hover={{ bg: 'brand.600' }}>
                    Log in
                </Button>
                <Stack gap="xs" textAlign="center" fontSize="sm">
                    <Text color="fg.muted">
                        <Link href="/forgot-password">Forgot password?</Link>
                    </Text>
                    <Text color="fg.muted">
                        No account? <Link href="/register">Register</Link>
                    </Text>
                </Stack>
            </Stack>
        </form>
    );
}
