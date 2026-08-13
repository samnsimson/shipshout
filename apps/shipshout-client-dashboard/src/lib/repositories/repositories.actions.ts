'use server';

import { redirect } from 'next/navigation';
import { ApiErrorUtils } from '@/lib/api/api-error.utils';
import { RepositoriesApi } from './repositories.api';

export async function disconnectGithub(): Promise<{ ok: true } | { ok: false; error: string }> {
    const result = await RepositoriesApi.disconnectGithub();
    if (result.error) return { ok: false, error: ApiErrorUtils.message(result.error, 'Request failed') };
    redirect('/dashboard/repositories');
}

export async function linkRepositories(githubIds: number[]): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!Array.isArray(githubIds) || githubIds.length === 0) return { ok: false, error: 'Select at least one repository' };

    const result = await RepositoriesApi.linkRepositories(githubIds);
    if (result.error) return { ok: false, error: ApiErrorUtils.message(result.error, 'Request failed') };
    redirect('/dashboard/repositories');
}

export async function unlinkRepository(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!id) return { ok: false, error: 'Invalid repository id' };

    const result = await RepositoriesApi.unlinkRepository(id);
    if (result.error) return { ok: false, error: ApiErrorUtils.message(result.error, 'Request failed') };
    redirect('/dashboard/repositories');
}
