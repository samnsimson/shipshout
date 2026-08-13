'use server';

import { revalidatePath } from 'next/cache';
import { ShipshoutApi } from '@/lib/shipshout.api';
import { TriggersApi } from './triggers.api';

export class TriggersActions {
    static async updateRepositoryTriggers(
        repositoryId: string,
        triggers: { release: boolean; tagPush: boolean; branchPush: boolean },
    ): Promise<{ ok: true } | { ok: false; error: string }> {
        const result = await TriggersApi.updateRepositoryTriggers(repositoryId, triggers);
        if (result.error || !result.response?.ok) return { ok: false, error: ShipshoutApi.errorMessage(result.error, 'Failed to save triggers') };

        revalidatePath(`/dashboard/repositories/${repositoryId}`);
        revalidatePath('/dashboard/repositories');
        return { ok: true };
    }
}
