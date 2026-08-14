import { normalizeGithubRelease } from '../../utils/normalize-release';

it('extracts id and summary from a release payload', () => {
    const out = normalizeGithubRelease({
        repository: { id: 100 },
        release: { id: 42, name: 'v1.2', body: '- fix auth\n- speed up cache' },
    });
    expect(out.externalId).toBe('100');
    expect(out.commitSummary).toContain('fix auth');
});

it('falls back to release id when repository is absent', () => {
    const out = normalizeGithubRelease({
        release: { id: 42, name: 'v1.2', body: 'fix' },
    });
    expect(out.externalId).toBe('42');
});
