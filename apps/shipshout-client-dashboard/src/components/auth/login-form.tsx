'use client';

import { Alert, Button, Field, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { loginAction } from '../../lib/auth/actions';
import { AuthInput } from './auth-input';
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
            <Stack gap="lg">
                <SocialButtons />
                {error ? (
                    <Alert.Root status="error" borderRadius="md">
                        <Alert.Indicator />
                        <Alert.Title>{error}</Alert.Title>
                    </Alert.Root>
                ) : null}
                <Stack gap="md">
                    <Field.Root required gap="xs">
                        <Field.Label fontSize="sm" fontWeight="500">
                            Email or username
                        </Field.Label>
                        <AuthInput name="login" autoComplete="username" />
                    </Field.Root>
                    <Field.Root required gap="xs">
                        <Field.Label fontSize="sm" fontWeight="500">
                            Password
                        </Field.Label>
                        <AuthInput name="password" type="password" autoComplete="current-password" />
                    </Field.Root>
                </Stack>
                <Button
                    type="submit"
                    loading={pending}
                    bg="brand.solid"
                    color="white"
                    borderRadius="full"
                    h="44px"
                    fontWeight="500"
                    _hover={{ bg: 'brand.600' }}
                >
                    Log in
                </Button>
                <Stack gap="xs" textAlign="center" fontSize="sm" pt="xs">
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
