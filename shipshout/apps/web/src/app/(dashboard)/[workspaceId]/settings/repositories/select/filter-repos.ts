export type RepoSummary = { id: number; full_name: string };

export function filterRepos(repos: RepoSummary[], query: string): RepoSummary[] {
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter((r) => r.full_name.toLowerCase().includes(q));
}

export function visibleSelectAllState(visible: RepoSummary[], selected: Set<number>): boolean | 'indeterminate' {
    if (visible.length === 0) return false;
    const count = visible.filter((r) => selected.has(r.id)).length;
    if (count === 0) return false;
    if (count === visible.length) return true;
    return 'indeterminate';
}

export function toggleVisibleSelection(selected: Set<number>, visible: RepoSummary[], selectAll: boolean): Set<number> {
    const next = new Set(selected);
    const visibleIds = visible.map((r) => r.id);
    if (selectAll) visibleIds.forEach((id) => next.add(id));
    else visibleIds.forEach((id) => next.delete(id));
    return next;
}
