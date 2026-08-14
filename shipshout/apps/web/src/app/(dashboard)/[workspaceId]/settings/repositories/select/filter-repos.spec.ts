import { filterRepos, toggleVisibleSelection, visibleSelectAllState } from './filter-repos';

const repos = [
    { id: 1, full_name: 'CDSA365/admin-portal' },
    { id: 2, full_name: 'CDSA365/web-app' },
    { id: 3, full_name: 'other-org/docs' },
];

describe('filterRepos', () => {
    it('returns all repos when query is empty or whitespace', () => {
        expect(filterRepos(repos, '')).toEqual(repos);
        expect(filterRepos(repos, '   ')).toEqual(repos);
    });

    it('filters case-insensitively on full_name', () => {
        expect(filterRepos(repos, 'cdsa365')).toHaveLength(2);
        expect(filterRepos(repos, 'ADMIN')).toEqual([repos[0]]);
        expect(filterRepos(repos, 'docs')).toEqual([repos[2]]);
    });

    it('returns empty array when nothing matches', () => {
        expect(filterRepos(repos, 'zzz')).toEqual([]);
    });
});

describe('visibleSelectAllState', () => {
    it('returns false when no visible repos', () => {
        expect(visibleSelectAllState([], new Set([1]))).toBe(false);
    });

    it('returns true when all visible are selected', () => {
        expect(visibleSelectAllState(repos.slice(0, 2), new Set([1, 2]))).toBe(true);
    });

    it('returns false when none visible are selected', () => {
        expect(visibleSelectAllState(repos.slice(0, 2), new Set([3]))).toBe(false);
    });

    it('returns indeterminate when some visible are selected', () => {
        expect(visibleSelectAllState(repos.slice(0, 2), new Set([1]))).toBe('indeterminate');
    });
});

describe('toggleVisibleSelection', () => {
    it('selects all visible ids when selectAll is true', () => {
        const next = toggleVisibleSelection(new Set([99]), repos.slice(0, 2), true);
        expect(next).toEqual(new Set([99, 1, 2]));
    });

    it('deselects only visible ids when selectAll is false', () => {
        const next = toggleVisibleSelection(new Set([1, 2, 3]), repos.slice(0, 2), false);
        expect(next).toEqual(new Set([3]));
    });
});
