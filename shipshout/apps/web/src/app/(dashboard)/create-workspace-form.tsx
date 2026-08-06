'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createWorkspace } from '../../lib/workspaces';

export function CreateWorkspaceForm() {
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    return (
        <form
            style={{ display: 'grid', gap: 12, maxWidth: 360, marginTop: 16 }}
            onSubmit={async (e) => {
                e.preventDefault();
                setSubmitting(true);
                setError(null);
                try {
                    const ws = await createWorkspace(name);
                    router.push(`/${ws.id}/drafts`);
                } catch {
                    setError('Could not create workspace. Try a different name.');
                    setSubmitting(false);
                }
            }}
        >
            <label style={{ display: 'grid', gap: 6 }}>
                <span>Workspace name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." required />
            </label>
            <button type="submit" disabled={submitting || !name.trim()}>
                {submitting ? 'Creating…' : 'Create workspace'}
            </button>
            {error ? <span style={{ color: '#dc2626' }}>{error}</span> : null}
        </form>
    );
}
