import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSessionAction } from '../../lib/auth/actions';
import { DashboardContent } from '../../components/dashboard/dashboard-content';
import { DashboardShell } from '../../components/dashboard/dashboard-shell';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
    const session = await getSessionAction();
    if (!session) redirect('/auth/clear-session');

    const { user } = session;
    return (
        <DashboardShell user={user}>
            <DashboardContent>{children}</DashboardContent>
        </DashboardShell>
    );
}

