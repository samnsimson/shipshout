import { normalizeLinear } from './normalize';

describe('normalizeLinear', () => {
    it('marks completed issues and extracts summary', () => {
        const out = normalizeLinear({ action: 'update', type: 'Issue', data: { id: 'iss_1', title: 'Fix cache', state: { type: 'completed' } } });
        expect(out.isCompletion).toBe(true);
        expect(out.externalId).toBe('iss_1');
        expect(out.commitSummary).toContain('Fix cache');
    });
});
