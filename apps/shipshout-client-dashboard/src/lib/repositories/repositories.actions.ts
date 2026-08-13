'use server';

import { redirect } from 'next/navigation';
import { RepositoriesApi } from './repositories.api';

export class RepositoriesActions {
    static async disconnectGithub(): Promise<{ ok: true } | { ok: false; error: string }> {
        const { api, requestOptions } = await RepositoriesApi.getClient();
        const result = await api.disconnectGithub(requestOptions);

        if (result && 'error' in result && result.error) return { ok: false, error: RepositoriesActions.errorToMessage(result.error) };

        redirect('/dashboard/repositories');
    }

    static async linkRepositories(githubIds: number[]): Promise<{ ok: true } | { ok: false; error: string }> {
        if (!Array.isArray(githubIds) || githubIds.length === 0) return { ok: false, error: 'Select at least one repository' };

        const { api, requestOptions } = await RepositoriesApi.getClient();
        const result = await api.linkRepositories({
            ...requestOptions,
            body: { githubIds },
        });

        if (result && 'error' in result && result.error) return { ok: false, error: RepositoriesActions.errorToMessage(result.error) };

        redirect('/dashboard/repositories');
    }

    static async unlinkRepository(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
        if (!id) return { ok: false, error: 'Invalid repository id' };

        const { api, requestOptions } = await RepositoriesApi.getClient();
        const result = await api.unlinkRepository({
            ...requestOptions,
            path: { id },
        });

        if (result && 'error' in result && result.error) return { ok: false, error: RepositoriesActions.errorToMessage(result.error) };

        redirect('/dashboard/repositories');
    }

    private static errorToMessage(error: unknown): string {
        if (!error) return 'Request failed';
        if (typeof error === 'string') return error;
        if (typeof error === 'object' && 'message' in error) {
            const msg = (error as { message?: unknown }).message;
            if (typeof msg === 'string' && msg) return msg;
        }
        return 'Request failed';
    }
}
