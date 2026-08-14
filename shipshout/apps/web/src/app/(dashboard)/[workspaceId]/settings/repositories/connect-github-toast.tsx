'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toaster } from '@/components/ui/toaster';

export function ConnectGithubToast() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const connected = searchParams.get('connected');
        if (connected == null) return;
        const count = Number(connected);
        const skipped = Number(searchParams.get('skipped') ?? 0);
        const reason = searchParams.get('reason');
        if (count > 0) toaster.create({ type: 'success', title: `Connected ${count} ${count === 1 ? 'repository' : 'repositories'}` });
        else if (skipped > 0) toaster.create({ type: 'info', title: 'Repositories already connected', description: 'No new repositories were added.' });
        else if (reason === 'no_access') toaster.create({ type: 'info', title: 'No repositories connected', description: 'Grant access to at least one repository on GitHub, then try again.' });
        else toaster.create({ type: 'info', title: 'No repositories connected', description: 'No new repositories were available to connect.' });
        router.replace(pathname);
    }, [searchParams, router, pathname]);

    return null;
}
