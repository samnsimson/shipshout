'use client';

import { useState } from 'react';

export async function generateTweet(releaseNotes: string): Promise<{ tweet: string }> {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
    const res = await fetch(`${base}/api/public/tweet`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ releaseNotes }),
    });
    if (res.status === 429) throw new Error('Rate limit reached — sign up for more.');
    if (!res.ok) throw new Error('Generation failed');
    return res.json();
}

export function Generator() {
    const [notes, setNotes] = useState('');
    const [tweet, setTweet] = useState('');
    const [err, setErr] = useState('');
    const [loading, setLoading] = useState(false);

    async function run() {
        setErr('');
        setLoading(true);
        try {
            setTweet((await generateTweet(notes)).tweet);
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={8}
                style={{ width: '100%' }}
                placeholder="Paste your GitHub release notes or commit log..."
            />
            <button type="button" onClick={run} disabled={loading || !notes}>
                {loading ? 'Generating…' : 'Generate tweet'}
            </button>
            {err ? <p style={{ color: 'crimson' }}>{err}</p> : null}
            {tweet ? (
                <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginTop: 16 }}>
                    <p>{tweet}</p>
                    <button type="button" onClick={() => navigator.clipboard.writeText(tweet)}>
                        Copy
                    </button>
                </div>
            ) : null}
            <p style={{ marginTop: 24 }}>
                Want automatic multi-channel posts on every release? <a href="/login">Sign up for ShipShout →</a>
            </p>
        </div>
    );
}
