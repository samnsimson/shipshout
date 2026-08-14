'use client';

import { Alert, Button, Field, Show, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { login } from '@/lib/auth/auth.actions';
import { FormUtils } from '@/lib/forms/form.utils';
import { AuthInput } from './auth-input';
import { SocialButtons } from './social-buttons';

type LoginFormValues = {
    login: string;
    password: string;
};

export function LoginForm() {
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const { register, handleSubmit } = useForm<LoginFormValues>();

    const onSubmit = handleSubmit((values) => {
        startTransition(async () => {
            setError(null);
            const result = await login(FormUtils.toFormData(values));
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
                            Email or username
                        </Field.Label>
                        <AuthInput {...register('login', { required: true })} autoComplete="username" />
                    </Field.Root>
                    <Field.Root required gap="xs">
                        <Field.Label fontSize="sm" fontWeight="500">
                            Password
                        </Field.Label>
                        <AuthInput {...register('password', { required: true })} type="password" autoComplete="current-password" />
                    </Field.Root>
                </Stack>
                <Button
                    type="submit"
                    loading={pending}
                    bg="brand.solid"
                    color="white"
                    borderRadius="lg"
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
