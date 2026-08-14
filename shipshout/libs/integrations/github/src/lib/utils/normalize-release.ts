export function normalizeGithubRelease(payload: any): { externalId: string; commitSummary: string } {
    const r = payload?.release ?? {};
    const repoId = payload?.repository?.id;
    return {
        externalId: repoId != null ? String(repoId) : String(r.id ?? payload?.id ?? ''),
        commitSummary: [r.name, r.body].filter(Boolean).join('\n'),
    };
}
