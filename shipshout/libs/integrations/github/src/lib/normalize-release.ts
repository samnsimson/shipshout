export function normalizeGithubRelease(payload: any): { externalId: string; commitSummary: string } {
    const r = payload?.release ?? {};
    return {
        externalId: String(r.id ?? payload?.id ?? ''),
        commitSummary: [r.name, r.body].filter(Boolean).join('\n'),
    };
}
