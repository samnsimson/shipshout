'use client';

import { Alert, Button, Field, Input, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { resetPasswordAction } from '../../lib/auth/actions';

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
                <Text textAlign="center" fontSize="sm">
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
            <Stack gap="md">
                {error ? (
                    <Alert.Root status="error" borderRadius="md">
                        <Alert.Indicator />
                        <Alert.Title>{error}</Alert.Title>
                    </Alert.Root>
                ) : null}
                <input type="hidden" name="token" value={token} />
                <Field.Root required>
                    <Field.Label fontSize="sm">New password</Field.Label>
                    <Input name="newPassword" type="password" autoComplete="new-password" borderRadius="xs" minLength={8} />
                </Field.Root>
                <Field.Root required>
                    <Field.Label fontSize="sm">Confirm password</Field.Label>
                    <Input name="confirmPassword" type="password" autoComplete="new-password" borderRadius="xs" minLength={8} />
                </Field.Root>
                <Button type="submit" loading={pending} bg="brand.solid" color="white" borderRadius="full" _hover={{ bg: 'brand.600' }}>
                    Reset password
                </Button>
            </Stack>
        </form>
    );
}
