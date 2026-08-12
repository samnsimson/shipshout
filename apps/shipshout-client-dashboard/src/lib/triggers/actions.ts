'use server';

import { revalidatePath } from 'next/cache';
import { getShipshoutRequestOptions } from '../shipshout-api';

export async function updateRepositoryTriggersAction(
    repositoryId: string,
    triggers: { release: boolean; tagPush: boolean; branchPush: boolean },
): Promise<{ ok: true } | { ok: false; error: string }> {
    const { baseUrl, headers } = await getShipshoutRequestOptions();
    const response = await fetch(`${baseUrl}/repositories/${repositoryId}/triggers`, {
        method: 'PATCH',
        headers: {
            ...headers,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(triggers),
        cache: 'no-store',
    });

    if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' ? body.message : 'Failed to save triggers';
        return { ok: false, error: message };
    }

    revalidatePath(`/dashboard/repositories/${repositoryId}`);
    revalidatePath('/dashboard/repositories');
    return { ok: true };
}
