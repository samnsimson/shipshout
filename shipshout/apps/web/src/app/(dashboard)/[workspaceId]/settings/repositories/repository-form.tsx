'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRepository } from '../../../../../lib/repositories';

function randomExternalId() {
    return Math.random().toString(36).slice(2, 10);
}

export function RepositoryForm({ workspaceId }: { workspaceId: string }) {
    const [provider, setProvider] = useState('github');
    const [name, setName] = useState('');
    const [externalId, setExternalId] = useState(randomExternalId());
    const [created, setCreated] = useState<{ webhookSecret: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    return (
        <div>
            <form
                style={{ display: 'grid', gap: 12, maxWidth: 480 }}
                onSubmit={async (e) => {
                    e.preventDefault();
                    setError(null);
                    try {
                        const { webhookSecret } = await createRepository(workspaceId, { provider, name, externalId });
                        setCreated({ webhookSecret });
                        setName('');
                        setExternalId(randomExternalId());
                        router.refresh();
                    } catch {
                        setError('Could not add repository. Check the fields and try again.');
                    }
                }}
            >
                <label style={{ display: 'grid', gap: 6 }}>
                    <span>Provider</span>
                    <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                        <option value="github">GitHub</option>
                        <option value="linear">Linear</option>
                        <option value="jira">Jira</option>
                    </select>
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                    <span>Name</span>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="acme/website" required />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                    <span>External ID</span>
                    <input value={externalId} onChange={(e) => setExternalId(e.target.value)} required />
                    <small style={{ color: '#666' }}>
                        Must match the id in the incoming payload. Leave as-is if you&apos;ll only use &quot;Send test release&quot;.
                    </small>
                </label>
                <button type="submit">Add repository</button>
                {error ? <span style={{ color: '#dc2626' }}>{error}</span> : null}
            </form>
            {created ? (
                <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                    <p>
                        Webhook URL: <code>{process.env.NEXT_PUBLIC_API_BASE_URL}/api/webhooks/github</code>
                    </p>
                    <p>
                        Webhook secret (shown once): <code>{created.webhookSecret}</code>
                    </p>
                </div>
            ) : null}
        </div>
    );
}
