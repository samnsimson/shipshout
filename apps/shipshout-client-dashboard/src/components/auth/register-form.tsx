'use client';

import { Alert, Button, Field, Input, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { checkUsernameAction, registerAction } from '../../lib/auth/actions';
import { SocialButtons } from './social-buttons';

export function RegisterForm() {
    const [error, setError] = useState<string | null>(null);
    const [usernameHint, setUsernameHint] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    return (
        <form
            action={(formData) =>
                startTransition(async () => {
                    setError(null);
                    const result = await registerAction(formData);
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
                    <Field.Label fontSize="sm">Name</Field.Label>
                    <Input name="name" autoComplete="name" borderRadius="xs" />
                </Field.Root>
                <Field.Root required>
                    <Field.Label fontSize="sm">Username</Field.Label>
                    <Input
                        name="username"
                        autoComplete="username"
                        borderRadius="xs"
                        onBlur={async (e) => {
                            const value = e.target.value.trim();
                            if (value.length < 3) {
                                setUsernameHint(null);
                                return;
                            }
                            const result = await checkUsernameAction(value);
                            if ('available' in result) setUsernameHint(result.available ? 'Username is available' : 'Username is taken');
                            else if (!result.ok) setUsernameHint(result.error);
                        }}
                    />
                    {usernameHint ? (
                        <Field.HelperText fontSize="xs" color="fg.muted">
                            {usernameHint}
                        </Field.HelperText>
                    ) : null}
                </Field.Root>
                <Field.Root required>
                    <Field.Label fontSize="sm">Email</Field.Label>
                    <Input name="email" type="email" autoComplete="email" borderRadius="xs" />
                </Field.Root>
                <Field.Root required>
                    <Field.Label fontSize="sm">Password</Field.Label>
                    <Input name="password" type="password" autoComplete="new-password" borderRadius="xs" minLength={8} />
                </Field.Root>
                <Button type="submit" loading={pending} bg="brand.solid" color="white" borderRadius="full" _hover={{ bg: 'brand.600' }}>
                    Create account
                </Button>
                <Text textAlign="center" fontSize="sm" color="fg.muted">
                    Already have an account? <Link href="/login">Log in</Link>
                </Text>
            </Stack>
        </form>
    );
}
