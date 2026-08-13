'use client';

import { Alert, Button, Field, Show, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { AuthActions } from '@/lib/auth/auth.actions';
import { FormUtils } from '@/lib/forms/form.utils';
import { AuthInput } from './auth-input';
import { SocialButtons } from './social-buttons';

type RegisterFormValues = {
    name: string;
    username: string;
    email: string;
    password: string;
};

export function RegisterForm() {
    const [error, setError] = useState<string | null>(null);
    const [usernameHint, setUsernameHint] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const { register, handleSubmit } = useForm<RegisterFormValues>();

    const onSubmit = handleSubmit((values) => {
        startTransition(async () => {
            setError(null);
            const result = await AuthActions.register(FormUtils.toFormData(values));
            if (result && !result.ok) setError(result.error);
        });
    });

    return (
        <form onSubmit={onSubmit}>
            <Stack gap="lg">
                <SocialButtons />
                <Show when={error}>
                    <Alert.Root status="error" borderRadius="md">
                        <Alert.Indicator />
                        <Alert.Title>{error}</Alert.Title>
                    </Alert.Root>
                </Show>
                <Stack gap="md">
                    <Field.Root required gap="xs">
                        <Field.Label fontSize="sm" fontWeight="500">
                            Name
                        </Field.Label>
                        <AuthInput {...register('name', { required: true })} autoComplete="name" />
                    </Field.Root>
                    <Field.Root required gap="xs">
                        <Field.Label fontSize="sm" fontWeight="500">
                            Username
                        </Field.Label>
                        <AuthInput
                            {...register('username', {
                                required: true,
                                onBlur: async (event) => {
                                    const value = event.target.value.trim();
                                    if (value.length < 3) {
                                        setUsernameHint(null);
                                        return;
                                    }
                                    const result = await AuthActions.checkUsername(value);
                                    if ('available' in result) setUsernameHint(result.available ? 'Username is available' : 'Username is taken');
                                    else if (!result.ok) setUsernameHint(result.error);
                                },
                            })}
                            autoComplete="username"
                        />
                        <Show when={usernameHint}>
                            <Field.HelperText fontSize="xs" color="fg.muted" mt="xxs">
                                {usernameHint}
                            </Field.HelperText>
                        </Show>
                    </Field.Root>
                    <Field.Root required gap="xs">
                        <Field.Label fontSize="sm" fontWeight="500">
                            Email
                        </Field.Label>
                        <AuthInput {...register('email', { required: true })} type="email" autoComplete="email" />
                    </Field.Root>
                    <Field.Root required gap="xs">
                        <Field.Label fontSize="sm" fontWeight="500">
                            Password
                        </Field.Label>
                        <AuthInput {...register('password', { required: true, minLength: 8 })} type="password" autoComplete="new-password" minLength={8} />
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
