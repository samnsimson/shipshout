'use client';

import { Button } from '@chakra-ui/react';
import { LogOut } from 'lucide-react';
import { useTransition } from 'react';
import { AuthActions } from '@/lib/auth/auth.actions';

export function LogoutButton() {
    const [pending, startTransition] = useTransition();

    return (
        <Button
            type="button"
            loading={pending}
            variant="outline"
            borderRadius="full"
            borderColor="border.hairline"
            gap="xs"
            onClick={() => startTransition(() => AuthActions.logout())}
        >
            <LogOut size={14} strokeWidth={2} aria-hidden />
            Log out
        </Button>
    );
}
