'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { mockConnect, connectUrl } from '../../../../../lib/connections';

const LABELS: Record<string, string> = {
    x: 'X (Twitter)',
    linkedin: 'LinkedIn',
    email: 'Email',
    buffer: 'Buffer',
    mailchimp: 'Mailchimp',
};

export function ConnectionRow({ workspaceId, channel, connected }: { workspaceId: string; channel: string; connected: boolean }) {
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    return (
        <article
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid #ddd',
                borderRadius: 8,
                padding: 16,
                background: '#fff',
            }}
        >
            <div>
                <strong>{LABELS[channel] ?? channel}</strong>
                <span style={{ marginLeft: 8, color: connected ? '#059669' : '#666' }}>{connected ? 'Connected' : 'Not connected'}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <a href={connectUrl(workspaceId, channel)}>Connect</a>
                <button
                    type="button"
                    onClick={async () => {
                        setError(null);
                        try {
                            await mockConnect(workspaceId, channel);
                            router.refresh();
                        } catch {
                            setError('Test connect is disabled in this environment.');
                        }
                    }}
                >
                    Connect (test)
                </button>
                {error ? <span style={{ color: '#dc2626' }}>{error}</span> : null}
            </div>
        </article>
    );
}
