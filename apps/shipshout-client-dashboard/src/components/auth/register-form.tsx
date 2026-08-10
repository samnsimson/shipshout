'use client';

import { Alert, Button, Field, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { checkUsernameAction, registerAction } from '../../lib/auth/actions';
import { AuthInput } from './auth-input';
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
                            Name
                        </Field.Label>
                        <AuthInput name="name" autoComplete="name" />
                    </Field.Root>
                    <Field.Root required gap="xs">
                        <Field.Label fontSize="sm" fontWeight="500">
                            Username
                        </Field.Label>
                        <AuthInput
                            name="username"
                            autoComplete="username"
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
                            <Field.HelperText fontSize="xs" color="fg.muted" mt="xxs">
                                {usernameHint}
                            </Field.HelperText>
                        ) : null}
                    </Field.Root>
                    <Field.Root required gap="xs">
                        <Field.Label fontSize="sm" fontWeight="500">
                            Email
                        </Field.Label>
                        <AuthInput name="email" type="email" autoComplete="email" />
                    </Field.Root>
                    <Field.Root required gap="xs">
                        <Field.Label fontSize="sm" fontWeight="500">
                            Password
                        </Field.Label>
                        <AuthInput name="password" type="password" autoComplete="new-password" minLength={8} />
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
                    Create account
                </Button>
                <Text textAlign="center" fontSize="sm" color="fg.muted" pt="xs">
                    Already have an account? <Link href="/login">Log in</Link>
                </Text>
            </Stack>
        </form>
    );
}
