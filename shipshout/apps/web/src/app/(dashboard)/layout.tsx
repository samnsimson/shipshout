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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const workspaces = await getWorkspaces();
  return (
    <div>
      <header style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid #ccc' }}>
        <strong>ShipShout</strong>
        <span>{user.name ?? user.githubId}</span>
        <select aria-label="Workspace">
          {workspaces.map((ws: { id: string; name: string }) => (
            <option key={ws.id} value={ws.id}>
              {ws.name}
            </option>
          ))}
        </select>
      </header>
      {children}
    </div>
  );
}
