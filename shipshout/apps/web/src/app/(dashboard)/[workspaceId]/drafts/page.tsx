import { listDrafts } from '../../../../lib/drafts';
import { DraftCard } from './draft-card';

export default async function DraftsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const drafts = await listDrafts(workspaceId);
  return (
    <main style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Drafts</h1>
      {drafts.length === 0 ? (
        <p style={{ color: '#666' }}>No drafts yet. Connect a repo and push a release to get started.</p>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {drafts.map((d: { id: string }) => (
            <DraftCard key={d.id} workspaceId={workspaceId} draft={d as any} />
          ))}
        </div>
      )}
    </main>
  );
}
