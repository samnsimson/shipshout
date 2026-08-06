import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiFetch } from '../../lib/api-client';
import { getSessionUser } from '../../lib/session';
import { WorkspaceSwitcher } from './workspace-switcher';

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
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
            <header
                style={{
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center',
                    padding: '1rem 2rem',
                    borderBottom: '1px solid #e2e8f0',
                    background: '#fff',
                }}
            >
                <Link href="/" style={{ fontWeight: 700, textDecoration: 'none', color: '#0f172a' }}>
                    ShipShout
                </Link>
                <span style={{ color: '#64748b' }}>{user.name ?? user.githubId}</span>
                {activeWs ? (
                    <nav style={{ display: 'flex', gap: '1rem', marginLeft: 'auto' }}>
                        <Link href={`/${activeWs}/drafts`}>Drafts</Link>
                        <Link href={`/${activeWs}/settings/repositories`}>Repositories</Link>
                        <Link href={`/${activeWs}/settings/connections`}>Connections</Link>
                        <Link href={`/${activeWs}/settings/brand`}>Brand</Link>
                        <Link href={`/${activeWs}/settings/billing`}>Billing</Link>
                    </nav>
                ) : null}
                <WorkspaceSwitcher workspaces={workspaces} activeId={activeWs} />
            </header>
            {children}
        </div>
    );
}
