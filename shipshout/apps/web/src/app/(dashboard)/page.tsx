import { redirect } from 'next/navigation';
import { apiFetch } from '../../lib/api-client';
import { getSessionUser } from '../../lib/session';

async function getWorkspaces() {
    try {
        return await apiFetch('/workspaces');
    } catch {
        return [];
    }
}

export default async function DashboardPage() {
    const user = await getSessionUser();
    if (!user) redirect('/login');
    const workspaces = await getWorkspaces();
    if (workspaces.length > 0) redirect(`/${workspaces[0].id}/drafts`);
    return (
        <main style={{ padding: '2rem' }}>
            <h1>Dashboard</h1>
            <p>Create a workspace to get started.</p>
        </main>
    );
}
