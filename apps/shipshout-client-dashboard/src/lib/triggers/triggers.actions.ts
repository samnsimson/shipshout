'use server';

import { revalidatePath } from 'next/cache';
import { ApiErrorUtils } from '@/lib/api/api-error.utils';
import { TriggersApi } from './triggers.api';

export async function updateRepositoryTriggers(
    repositoryId: string,
    triggers: { release: boolean; tagPush: boolean; branchPush: boolean },
): Promise<{ ok: true } | { ok: false; error: string }> {
    const result = await TriggersApi.updateRepositoryTriggers(repositoryId, triggers);
    if (result.error || !result.response?.ok) return { ok: false, error: ApiErrorUtils.message(result.error, 'Failed to save triggers') };

    revalidatePath(`/dashboard/repositories/${repositoryId}`);
    revalidatePath('/dashboard/repositories');
    return { ok: true };
}
