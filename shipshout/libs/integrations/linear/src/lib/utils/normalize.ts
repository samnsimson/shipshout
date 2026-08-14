export function normalizeLinear(payload: any): { externalId: string; commitSummary: string; isCompletion: boolean } {
    const d = payload?.data ?? {};
    return {
        externalId: String(d.id ?? ''),
        commitSummary: [d.title, d.description].filter(Boolean).join('\n'),
        isCompletion: d?.state?.type === 'completed',
    };
}
