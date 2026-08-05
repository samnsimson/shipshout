export function normalizeJira(payload: any): { externalId: string; commitSummary: string; isCompletion: boolean } {
    const issue = payload?.issue ?? {};
    const f = issue.fields ?? {};
    return {
        externalId: String(issue.id ?? ''),
        commitSummary: [f.summary, f.description].filter(Boolean).join('\n'),
        isCompletion: f?.status?.statusCategory?.key === 'done',
    };
}
