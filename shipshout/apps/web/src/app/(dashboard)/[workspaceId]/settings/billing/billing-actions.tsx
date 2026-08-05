'use client';

import { startCheckout, openPortal } from '../../../../../lib/billing';

export function BillingActions({ workspaceId, tier }: { workspaceId: string; tier: string }) {
    const subscribe = async () => {
        const { url } = await startCheckout(workspaceId, tier);
        window.location.href = url;
    };
    const manage = async () => {
        const { url } = await openPortal(workspaceId);
        window.location.href = url;
    };
    return (
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="button" onClick={subscribe}>
                Subscribe
            </button>
            <button type="button" onClick={manage}>
                Manage
            </button>
        </div>
    );
}
