'use client';

import { Alert, Button, Field, Show, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { forgotPassword } from '@/lib/auth/auth.actions';
import { FormUtils } from '@/lib/forms/form.utils';
import { AuthInput } from './auth-input';

type ForgotPasswordFormValues = {
    email: string;
};

export function ForgotPasswordForm() {
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const [pending, startTransition] = useTransition();
    const { register, handleSubmit } = useForm<ForgotPasswordFormValues>();

    const onSubmit = handleSubmit((values) => {
        startTransition(async () => {
            setError(null);
            const result = await forgotPassword(FormUtils.toFormData(values));
            if (!result.ok) setError(result.error);
            else setDone(true);
        });
    });

    if (done) {
        return (
            <Stack gap="md">
                <Alert.Root status="success" borderRadius="md">
                    <Alert.Indicator />
                    <Alert.Title>If that email exists, we sent reset instructions.</Alert.Title>
                </Alert.Root>
                <Text textAlign="center" fontSize="sm" pt="xs">
                    <Link href="/login">Back to login</Link>
                </Text>
            </Stack>
        );
    }

    return (
        <form onSubmit={onSubmit}>
            <Stack gap="lg">
                <Show when={error}>
                    <Alert.Root status="error" borderRadius="md">
                        <Alert.Indicator />
                        <Alert.Title>{error}</Alert.Title>
                    </Alert.Root>
                </Show>
                <Field.Root required gap="xs">
                    <Field.Label fontSize="sm" fontWeight="500">
                        Email
                    </Field.Label>
                    <AuthInput {...register('email', { required: true })} type="email" autoComplete="email" />
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
                    Send reset link
                </Button>
                <Text textAlign="center" fontSize="sm" color="fg.muted" pt="xs">
                    <Link href="/login">Back to login</Link>
                </Text>
            </Stack>
        </form>
    );
}
