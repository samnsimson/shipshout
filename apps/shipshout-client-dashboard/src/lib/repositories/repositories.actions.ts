'use server';

import { redirect } from 'next/navigation';
import { ShipshoutApi } from '@/lib/shipshout.api';
import { RepositoriesApi } from './repositories.api';

export class RepositoriesActions {
    static async disconnectGithub(): Promise<{ ok: true } | { ok: false; error: string }> {
        const result = await RepositoriesApi.disconnectGithub();
        if (result.error) return { ok: false, error: ShipshoutApi.errorMessage(result.error, 'Request failed') };
        redirect('/dashboard/repositories');
    }

    static async linkRepositories(githubIds: number[]): Promise<{ ok: true } | { ok: false; error: string }> {
        if (!Array.isArray(githubIds) || githubIds.length === 0) return { ok: false, error: 'Select at least one repository' };

        const result = await RepositoriesApi.linkRepositories(githubIds);
        if (result.error) return { ok: false, error: ShipshoutApi.errorMessage(result.error, 'Request failed') };
        redirect('/dashboard/repositories');
    }

    static async unlinkRepository(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
        if (!id) return { ok: false, error: 'Invalid repository id' };

        const result = await RepositoriesApi.unlinkRepository(id);
        if (result.error) return { ok: false, error: ShipshoutApi.errorMessage(result.error, 'Request failed') };
        redirect('/dashboard/repositories');
    }
}
