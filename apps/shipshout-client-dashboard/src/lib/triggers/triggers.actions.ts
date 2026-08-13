'use server';

import { revalidatePath } from 'next/cache';
import { ShipshoutApi } from '@/lib/shipshout.api';

export class TriggersActions {
    static async updateRepositoryTriggers(
        repositoryId: string,
        triggers: { release: boolean; tagPush: boolean; branchPush: boolean },
    ): Promise<{ ok: true } | { ok: false; error: string }> {
        const response = await ShipshoutApi.fetch(`/repositories/${repositoryId}/triggers`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(triggers),
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
}
