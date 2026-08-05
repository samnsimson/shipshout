import { normalizeJira } from './normalize';

describe('normalizeJira', () => {
    it('extracts issue summary and done status', () => {
        const out = normalizeJira({
            webhookEvent: 'jira:issue_updated',
            issue: { id: '10001', fields: { summary: 'Ship checkout', status: { statusCategory: { key: 'done' } } } },
        });
        expect(out.externalId).toBe('10001');
        expect(out.commitSummary).toContain('Ship checkout');
        expect(out.isCompletion).toBe(true);
    });
});
