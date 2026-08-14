'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ShoutoutDto } from '@/lib/shoutouts/shoutouts.api';
import { ShoutoutsUtils } from '@/lib/shoutouts/shoutouts.utils';
import { ShoutoutsTable } from './shoutouts-table';

export function ShoutoutsClient(props: { shoutouts: ShoutoutDto[] }) {
    const router = useRouter();
    const hasInFlight = props.shoutouts.some((shoutout) => ShoutoutsUtils.isInFlight(shoutout.status));

    useEffect(() => {
        if (!hasInFlight) return;
        const intervalId = window.setInterval(() => router.refresh(), 3000);
        return () => window.clearInterval(intervalId);
    }, [hasInFlight, router]);

    return <ShoutoutsTable shoutouts={props.shoutouts} />;
}
