'use client';

import { Button } from '@chakra-ui/react';
import { useTransition } from 'react';
import { logoutAction } from '../../lib/auth/actions';

export function LogoutButton() {
    const [pending, startTransition] = useTransition();

    return (
        <Button
            type="button"
            loading={pending}
            variant="outline"
            borderRadius="full"
            borderColor="border.hairline"
            onClick={() => startTransition(() => logoutAction())}
        >
            Log out
        </Button>
    );
}
