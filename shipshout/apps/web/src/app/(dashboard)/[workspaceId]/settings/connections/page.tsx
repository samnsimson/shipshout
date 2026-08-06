import { listConnections } from '../../../../../lib/connections';
import { ConnectionRow } from './connection-row';

const CHANNELS = ['x', 'linkedin', 'email', 'buffer', 'mailchimp'] as const;

export default async function ConnectionsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = await params;
    const connections: { type: string; status: string }[] = await listConnections(workspaceId);
    return (
        <main style={{ padding: '2rem', maxWidth: 720, margin: '0 auto' }}>
            <h1 style={{ marginBottom: '1.5rem' }}>Connections</h1>
            <div style={{ display: 'grid', gap: 12 }}>
                {CHANNELS.map((channel) => (
                    <ConnectionRow
                        key={channel}
                        workspaceId={workspaceId}
                        channel={channel}
                        connected={connections.some((c) => c.type === channel && c.status === 'active')}
                    />
                ))}
            </div>
        </main>
    );
}
