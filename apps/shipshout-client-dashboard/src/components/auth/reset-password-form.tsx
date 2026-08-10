'use client';

import { Alert, Button, Field, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { resetPasswordAction } from '../../lib/auth/actions';
import { AuthInput } from './auth-input';

export function ResetPasswordForm({ token }: { token: string }) {
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const [pending, startTransition] = useTransition();

    if (!token) {
        return (
            <Alert.Root status="error" borderRadius="md">
                <Alert.Indicator />
                <Alert.Title>Missing reset token. Use the link from your email.</Alert.Title>
            </Alert.Root>
        );
    }

    if (done) {
        return (
            <Stack gap="md">
                <Alert.Root status="success" borderRadius="md">
                    <Alert.Indicator />
                    <Alert.Title>Password updated. You can log in now.</Alert.Title>
                </Alert.Root>
                <Text textAlign="center" fontSize="sm" pt="xs">
                    <Link href="/login">Log in</Link>
                </Text>
            </Stack>
        );
    }

    return (
        <form
            action={(formData) =>
                startTransition(async () => {
                    setError(null);
                    formData.set('token', token);
                    const result = await resetPasswordAction(formData);
                    if (!result.ok) setError(result.error);
                    else setDone(true);
                })
            }
        >
            <Stack gap="lg">
                {error ? (
                    <Alert.Root status="error" borderRadius="md">
                        <Alert.Indicator />
                        <Alert.Title>{error}</Alert.Title>
                    </Alert.Root>
                ) : null}
                <input type="hidden" name="token" value={token} />
                <Stack gap="md">
                    <Field.Root required gap="xs">
                        <Field.Label fontSize="sm" fontWeight="500">
                            New password
                        </Field.Label>
                        <AuthInput name="newPassword" type="password" autoComplete="new-password" minLength={8} />
                    </Field.Root>
                    <Field.Root required gap="xs">
                        <Field.Label fontSize="sm" fontWeight="500">
                            Confirm password
                        </Field.Label>
                        <AuthInput name="confirmPassword" type="password" autoComplete="new-password" minLength={8} />
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
                    Reset password
                </Button>
            </Stack>
        </form>
    );
}
