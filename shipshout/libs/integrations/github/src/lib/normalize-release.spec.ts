import { normalizeGithubRelease } from './normalize-release';

it('extracts id and summary from a release payload', () => {
    const out = normalizeGithubRelease({
        release: { id: 42, name: 'v1.2', body: '- fix auth\n- speed up cache' },
    });
    expect(out.externalId).toBe('42');
    expect(out.commitSummary).toContain('fix auth');
});
