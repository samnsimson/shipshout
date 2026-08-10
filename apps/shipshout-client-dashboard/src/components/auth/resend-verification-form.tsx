'use client';

import { Alert, Button, Field, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { resendVerificationAction } from '../../lib/auth/actions';
import { AuthInput } from './auth-input';

export function ResendVerificationForm({ defaultEmail = '' }: { defaultEmail?: string }) {
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const [pending, startTransition] = useTransition();

    if (done) {
        return (
            <Stack gap="md">
                <Alert.Root status="success" borderRadius="md">
                    <Alert.Indicator />
                    <Alert.Title>If an account exists, we sent a link.</Alert.Title>
                </Alert.Root>
                <Text textAlign="center" fontSize="sm" pt="xs">
                    <Link href="/login">Back to login</Link>
                </Text>
            </Stack>
        );
    }

    return (
        <form
            action={(formData) =>
                startTransition(async () => {
                    setError(null);
                    const result = await resendVerificationAction(formData);
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
                <Field.Root required gap="xs">
                    <Field.Label fontSize="sm" fontWeight="500">
                        Email
                    </Field.Label>
                    <AuthInput name="email" type="email" autoComplete="email" defaultValue={defaultEmail} />
                </Field.Root>
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
                    Resend verification email
                </Button>
                <Text textAlign="center" fontSize="sm" color="fg.muted" pt="xs">
                    <Link href="/login">Back to login</Link>
                </Text>
            </Stack>
        </form>
    );
}
