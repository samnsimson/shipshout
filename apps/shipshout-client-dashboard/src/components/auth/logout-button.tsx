'use client';

import { Button } from '@chakra-ui/react';
import { LogOut } from 'lucide-react';
import { useTransition } from 'react';
import { logout } from '@/lib/auth/auth.actions';

export function LogoutButton() {
    const [pending, startTransition] = useTransition();

    return (
        <Button
            type="button"
            loading={pending}
            variant="outline"
            borderRadius="lg"
            borderColor="border.hairline"
            gap="xs"
            onClick={() => startTransition(() => logout())}
        >
            <LogOut size={14} strokeWidth={2} aria-hidden />
            Log out
        </Button>
    );
}
