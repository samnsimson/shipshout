'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { simulateRelease } from '../../../../../lib/repositories';

type Repo = { id: string; provider: string; name: string; enabled: boolean };

export function RepositoryRow({ workspaceId, repo }: { workspaceId: string; repo: Repo }) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState(`Test release ${new Date().toLocaleString()}`);
    const [notes, setNotes] = useState('Testing the ShipShout pipeline.');
    const [message, setMessage] = useState<string | null>(null);
    const router = useRouter();

    return (
        <article style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <strong>{repo.name}</strong>
                    <span style={{ marginLeft: 8, color: '#666', fontSize: 14 }}>{repo.provider}</span>
                </div>
                <button type="button" onClick={() => setOpen((o) => !o)}>
                    Send test release
                </button>
            </header>
            {open ? (
                <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes" />
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                            type="button"
                            onClick={async () => {
                                setMessage(null);
                                try {
                                    const res = await simulateRelease(workspaceId, repo.id, { title, notes });
                                    setMessage(res.accepted ? 'Queued — check Drafts in a few seconds.' : 'Not accepted (usage limit reached?).');
                                    router.refresh();
                                } catch {
                                    setMessage('Failed to send test release.');
                                }
                            }}
                        >
                            Send
                        </button>
                        {message ? <span style={{ color: '#666' }}>{message}</span> : null}
                    </div>
                </div>
            ) : null}
        </article>
    );
}
