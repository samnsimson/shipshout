import { BillingActions } from './billing-actions';

const TIERS = [
    { id: 'starter', name: 'Starter', price: '$19/mo', points: ['1 repository', '10 releases/mo', 'Manual output'] },
    { id: 'pro', name: 'Pro', price: '$49/mo', points: ['3 repositories', 'Unlimited releases', 'Social API sync'] },
    { id: 'growth', name: 'Growth', price: '$149/mo', points: ['Unlimited repositories', 'Jira/Linear integrations', 'Email digests'] },
];

export default async function BillingPage({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = await params;
    return (
        <main style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
            <h1 style={{ marginBottom: '1.5rem' }}>Billing</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {TIERS.map((t) => (
                    <div key={t.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
                        <h2>{t.name}</h2>
                        <p>{t.price}</p>
                        <ul>
                            {t.points.map((p) => (
                                <li key={p}>{p}</li>
                            ))}
                        </ul>
                        <BillingActions workspaceId={workspaceId} tier={t.id} />
                    </div>
                ))}
            </div>
        </main>
    );
}
