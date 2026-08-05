'use client';

import { useState } from 'react';
import { updateDraft, approveDraft, publishDraft } from '../../../../lib/drafts';

type Draft = {
    id: string;
    channel: string;
    generatedCopy: string;
    editedCopy?: string;
    status: string;
};

export function DraftCard({ workspaceId, draft }: { workspaceId: string; draft: Draft }) {
    const [copy, setCopy] = useState(draft.editedCopy ?? draft.generatedCopy);
    const [status, setStatus] = useState(draft.status);
    const [saving, setSaving] = useState(false);

    return (
        <article
            style={{
                border: '1px solid #ddd',
                borderRadius: 8,
                padding: 16,
                background: '#fff',
            }}
        >
            <header style={{ marginBottom: 12 }}>
                <strong style={{ textTransform: 'capitalize' }}>{draft.channel}</strong>
                <span style={{ marginLeft: 8, color: '#666', fontSize: 14 }}>{status.replace('_', ' ')}</span>
            </header>
            <textarea
                value={copy}
                onChange={(e) => setCopy(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                    disabled={saving}
                    onClick={async () => {
                        setSaving(true);
                        try {
                            await updateDraft(workspaceId, draft.id, copy);
                        } finally {
                            setSaving(false);
                        }
                    }}
                >
                    Save
                </button>
                <button
                    onClick={async () => {
                        await approveDraft(workspaceId, draft.id);
                        setStatus('approved');
                    }}
                >
                    Approve
                </button>
                <button
                    disabled={status !== 'approved'}
                    onClick={async () => {
                        await publishDraft(workspaceId, draft.id);
                        setStatus('published');
                    }}
                >
                    Publish
                </button>
            </div>
        </article>
    );
}
