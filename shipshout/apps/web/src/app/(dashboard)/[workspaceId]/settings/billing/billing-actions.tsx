'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ButtonGroup } from '@chakra-ui/react';
import { toaster } from '@/components/ui/toaster';
import { startCheckout, openPortal } from '../../../../../lib/billing';
import { handleForbiddenClient } from '../../../../../lib/forbidden';

export function BillingActions({ workspaceId, tier }: { workspaceId: string; tier: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState<'subscribe' | 'manage' | null>(null);

    const run = async (kind: 'subscribe' | 'manage') => {
        setLoading(kind);
        try {
            const { url } = kind === 'subscribe' ? await startCheckout(workspaceId, tier) : await openPortal(workspaceId);
            window.location.href = url;
        } catch (error) {
            if (handleForbiddenClient(error, router.push)) return;
            toaster.create({ type: 'error', title: 'Could not open billing portal' });
            setLoading(null);
        }
    };

    return (
        <ButtonGroup w="full">
            <Button flex="1" colorPalette="signal" loading={loading === 'subscribe'} onClick={() => run('subscribe')}>
                Subscribe
            </Button>
            <Button flex="1" variant="outline" loading={loading === 'manage'} onClick={() => run('manage')}>
                Manage
            </Button>
        </ButtonGroup>
    );
}
