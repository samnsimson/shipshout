import { redirect } from 'next/navigation';
import { DashboardShell } from '@/layout/dashboard-shell';
import { apiFetch } from '../../lib/api-client';
import { getSessionUser } from '../../lib/session';

async function getWorkspaces() {
    try {
        return await apiFetch('/workspaces');
    } catch {
        return [];
    }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const user = await getSessionUser();
    if (!user) redirect('/login');
    const workspaces = await getWorkspaces();
    const activeWs = workspaces[0]?.id;
    return (
        <DashboardShell workspaces={workspaces} activeWs={activeWs} user={user}>
            {children}
        </DashboardShell>
    );
}
