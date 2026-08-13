'use client';

import { Alert, Button, Field, Show, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { resetPasswordAction } from '../../lib/auth/actions';
import { FormUtils } from '../../lib/forms/form.utils';
import { AuthInput } from './auth-input';

type ResetPasswordFormValues = {
    token: string;
    newPassword: string;
    confirmPassword: string;
};

export function ResetPasswordForm({ token }: { token: string }) {
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const [pending, startTransition] = useTransition();
    const { register, handleSubmit } = useForm<ResetPasswordFormValues>({
        defaultValues: { token, newPassword: '', confirmPassword: '' },
    });

    const onSubmit = handleSubmit((values) => {
        startTransition(async () => {
            setError(null);
            const result = await resetPasswordAction(FormUtils.toFormData({ ...values, token }));
            if (!result.ok) setError(result.error);
            else setDone(true);
        });
    });

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
        <form onSubmit={onSubmit}>
            <Stack gap="lg">
                <Show when={error}>
                    <Alert.Root status="error" borderRadius="md">
                        <Alert.Indicator />
                        <Alert.Title>{error}</Alert.Title>
                    </Alert.Root>
                </Show>
                <input type="hidden" {...register('token')} />
                <Stack gap="md">
                    <Field.Root required gap="xs">
                        <Field.Label fontSize="sm" fontWeight="500">
                            New password
                        </Field.Label>
                        <AuthInput {...register('newPassword', { required: true, minLength: 8 })} type="password" autoComplete="new-password" minLength={8} />
                    </Field.Root>
                    <Field.Root required gap="xs">
                        <Field.Label fontSize="sm" fontWeight="500">
                            Confirm password
                        </Field.Label>
                        <AuthInput {...register('confirmPassword', { required: true, minLength: 8 })} type="password" autoComplete="new-password" minLength={8} />
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
