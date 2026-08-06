import { listRepositories } from '../../../../../lib/repositories';
import { RepositoryForm } from './repository-form';
import { RepositoryRow } from './repository-row';

type Repo = { id: string; provider: string; name: string; enabled: boolean };

export default async function RepositoriesPage({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = await params;
    const repos: Repo[] = await listRepositories(workspaceId);
    return (
        <main style={{ padding: '2rem', maxWidth: 720, margin: '0 auto' }}>
            <h1 style={{ marginBottom: '1.5rem' }}>Repositories</h1>
            {repos.length === 0 ? (
                <p style={{ color: '#666' }}>No repositories yet. Add one below.</p>
            ) : (
                <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
                    {repos.map((r) => (
                        <RepositoryRow key={r.id} workspaceId={workspaceId} repo={r} />
                    ))}
                </div>
            )}
            <RepositoryForm workspaceId={workspaceId} />
        </main>
    );
}
