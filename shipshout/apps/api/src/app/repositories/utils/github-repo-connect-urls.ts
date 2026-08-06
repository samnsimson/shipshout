const webBase = () => process.env.WEB_BASE_URL ?? 'http://localhost:4200';

export function reposSettingsUrl(workspaceId: string, query?: Record<string, string | number | undefined>) {
    const params = new URLSearchParams();
    if (query) {
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined) params.set(key, String(value));
        }
    }
    const q = params.toString();
    return `${webBase()}/${workspaceId}/settings/repositories${q ? `?${q}` : ''}`;
}

export function repoPickerUrl(workspaceId: string) {
    return `${webBase()}/${workspaceId}/settings/repositories/select`;
}

export function loginUrl(error?: string) {
    const base = `${webBase()}/login`;
    return error ? `${base}?error=${encodeURIComponent(error)}` : base;
}

export function emptySelectionQuery(skipped: number, total: number) {
    const params: Record<string, string> = { connected: '0', skipped: String(skipped) };
    if (total === 0) params.reason = 'no_access';
    return params;
}
