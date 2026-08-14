# Repository Picker Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the GitHub repo picker at `/[workspaceId]/settings/repositories/select` with client-side search, a scrollable list, select-all for filtered results, and a sticky connect footer — Vercel-style, frontend only.

**Architecture:** Extract pure filter/selection helpers (`filterRepos`, `visibleSelectAllState`) into a colocated module with Jest tests. Rewrite `repo-picker.tsx` to compose Chakra v3 `InputGroup` + search input, select-all checkbox (with indeterminate state), scrollable repo rows, and sticky footer. No API or `lib/repositories.ts` changes.

**Tech Stack:** Next.js 16 App Router, Chakra UI v3, `react-icons/lu`, Jest (`nx test web`).

## Global Constraints

- Chakra UI **v3** only: `colorPalette` (not `colorScheme`), `gap` (not `spacing`), `disabled` (not `isDisabled`), `Show` for conditional rendering (existing repo convention).
- **Never edit `apps/web/src/lib/repositories.ts`** or other `lib/*.ts` request modules.
- No backend/API changes; existing OAuth → pending session → import flow unchanged.
- Connect button label stays **"Connect selected"**; import toasts and redirects unchanged.
- Default on load: all repos pre-selected (existing behavior).
- Select-all applies to **visible (filtered)** repos only; off-filter selections persist.
- List `maxH="360px"` with `overflowY="auto"`; footer sticky inside card with `borderTopWidth="1px"`.
- Search: case-insensitive substring match on `full_name`; trim query; no debounce.
- Auto-focus search input after repos load (use `ref` + `useEffect` when `loading` becomes false).

---

### Task 1: Pure filter and selection helpers

**Files:**
- Create: `apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/select/filter-repos.ts`
- Create: `apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/select/filter-repos.spec.ts`

**Interfaces:**
- Produces:
  - `export type RepoSummary = { id: number; full_name: string }`
  - `export function filterRepos(repos: RepoSummary[], query: string): RepoSummary[]`
  - `export function visibleSelectAllState(visible: RepoSummary[], selected: Set<number>): boolean | 'indeterminate'`
  - `export function toggleVisibleSelection(selected: Set<number>, visible: RepoSummary[], selectAll: boolean): Set<number>`
- Consumed by: Task 2 `repo-picker.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/select/filter-repos.spec.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx nx run web:test --testPathPatterns=filter-repos`
Expected: FAIL — module `./filter-repos` not found

- [ ] **Step 3: Implement helpers**

```typescript
// apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/select/filter-repos.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx nx run web:test --testPathPatterns=filter-repos`
Expected: PASS (4 describe blocks, 8 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/\[workspaceId\]/settings/repositories/select/filter-repos.ts \
        apps/web/src/app/\(dashboard\)/\[workspaceId\]/settings/repositories/select/filter-repos.spec.ts
git commit -m "Add filter and selection helpers for repo picker search."
```

---

### Task 2: Searchable repo picker UI

**Files:**
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/select/repo-picker.tsx`

**Interfaces:**
- Consumes: `filterRepos`, `visibleSelectAllState`, `toggleVisibleSelection`, `RepoSummary` from `./filter-repos`
- Consumes (unchanged): `listPendingGithubRepos`, `importGithubRepos` from `../../../../../../lib/repositories`
- Consumes (unchanged): `PageHeader`, `Show`, `toaster`, `handleForbiddenClient`

- [ ] **Step 1: Add search and derived visible repos state**

At top of `RepoPicker`, add:

```typescript
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Checkbox, Flex, Input, InputGroup, Show, Stack, Text } from '@chakra-ui/react';
import { LuSearch } from 'react-icons/lu';
import { filterRepos, toggleVisibleSelection, visibleSelectAllState } from './filter-repos';

// inside component:
const [query, setQuery] = useState('');
const searchRef = useRef<HTMLInputElement>(null);
const visibleRepos = useMemo(() => filterRepos(repos, query), [repos, query]);
const selectAllChecked = visibleSelectAllState(visibleRepos, selected);
const isFiltered = query.trim().length > 0;

useEffect(() => {
    if (!loading) searchRef.current?.focus();
}, [loading]);
```

- [ ] **Step 2: Replace card body with search + select-all + scrollable list**

Structure inside `Card.Body` when `repos.length > 0`:

```tsx
<Stack gap="4">
    <InputGroup startElement={<LuSearch aria-hidden />}>
        <Input
            ref={searchRef}
            placeholder="Search repositories…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search repositories"
        />
    </InputGroup>

    <Checkbox.Root
        checked={selectAllChecked}
        disabled={visibleRepos.length === 0}
        onCheckedChange={() => {
            const selectAll = selectAllChecked !== true;
            setSelected(toggleVisibleSelection(selected, visibleRepos, selectAll));
        }}
    >
        <Checkbox.HiddenInput />
        <Checkbox.Control>
            <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Label>
            Select all{' '}
            <Text as="span" color="fg.muted">
                ({visibleRepos.length} visible)
            </Text>
        </Checkbox.Label>
    </Checkbox.Root>

    <Stack gap="2" maxH="360px" overflowY="auto" pr="1">
        <Show
            when={visibleRepos.length > 0}
            fallback={<Text color="fg.muted">No repositories match your search.</Text>}
        >
            {visibleRepos.map((repo) => (
                <Checkbox.Root
                    key={repo.id}
                    checked={selected.has(repo.id)}
                    onCheckedChange={() => toggle(repo.id)}
                >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control>
                        <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Checkbox.Label>
                        <RepoLabel fullName={repo.full_name} />
                    </Checkbox.Label>
                </Checkbox.Root>
            ))}
        </Show>
    </Stack>
</Stack>
```

Add a small local helper at bottom of file:

```tsx
function RepoLabel({ fullName }: { fullName: string }) {
    const slash = fullName.indexOf('/');
    if (slash === -1) return <>{fullName}</>;
    return (
        <>
            <Text as="span" color="fg.muted">
                {fullName.slice(0, slash + 1)}
            </Text>
            {fullName.slice(slash + 1)}
        </>
    );
}
```

- [ ] **Step 3: Add sticky footer with selected count**

Move the Connect button out of the scroll stack. After `Card.Body` content, use `Card.Footer` or a `Box` with top border inside the card:

```tsx
<Flex
    justify="space-between"
    align="center"
    gap="4"
    pt="4"
    mt="4"
    borderTopWidth="1px"
    borderColor="border.muted"
>
    <Text color="fg.muted" fontSize="sm">
        {selected.size === 0
            ? 'None selected'
            : selected.size === 1
              ? '1 repository selected'
              : `${selected.size} selected`}
    </Text>
    <Button
        colorPalette="signal"
        loading={submitting}
        disabled={selected.size === 0}
        onClick={/* keep existing import handler unchanged */}
    >
        Connect selected
    </Button>
</Flex>
```

Place footer inside `Card.Root` so it renders below body when repos exist. Keep loading and empty-repo states unchanged (no search/footer when `repos.length === 0`).

- [ ] **Step 4: Manual verification**

Run: `npx nx dev web` (with API running)

Checklist:
1. Navigate to `/[workspaceId]/settings/repositories/select` after GitHub OAuth
2. Search input auto-focused; typing filters list instantly
3. Select-all shows indeterminate when partially selected
4. Deselect-all visible keeps hidden selections
5. Footer count updates; Connect works

- [ ] **Step 5: Run existing web tests**

Run: `npx nx run web:test`
Expected: all pass (including new `filter-repos.spec.ts`)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/\[workspaceId\]/settings/repositories/select/repo-picker.tsx
git commit -m "Add searchable repo picker with select-all and sticky footer."
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| Client-side search on `full_name` | Task 1 `filterRepos`, Task 2 search input |
| Scrollable list maxH ~360px | Task 2 Step 2 |
| Select-all for visible/filtered repos | Task 1 helpers, Task 2 Step 2 |
| Sticky footer + selected count | Task 2 Step 3 |
| Auto-focus search after load | Task 2 Step 1 |
| No-match search message | Task 2 Step 2 |
| Loading / empty / error states unchanged | Task 2 Step 3 (preserve existing `Show` branches) |
| No API changes | Global Constraints |
| Connect import behavior unchanged | Task 2 Step 3 (reuse existing handler) |
| Owner/repo muted label polish | Task 2 `RepoLabel` helper |

## Self-Review

- No TBD/TODO placeholders in tasks.
- Types consistent: `RepoSummary` used in helpers and picker.
- Scope matches spec A — no org grouping, no backend, no keyboard shortcuts.
