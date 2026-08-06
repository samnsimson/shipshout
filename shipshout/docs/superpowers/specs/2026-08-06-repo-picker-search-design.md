# Repository Picker Search — Design Spec

**Date:** 2026-08-06  
**Status:** Approved (design)  
**Route:** `/[workspaceId]/settings/repositories/select`  
**Scope:** Minimal Vercel-like picker — search, scrollable list, select-all, sticky footer. Frontend only.

---

## 1. Goal

Improve the GitHub repository picker so users with many repos can quickly find and connect the ones they want. Replace the flat checkbox list with a searchable, scrollable panel and a sticky action footer.

**In scope:**
- Client-side search filtering on `full_name`
- Scrollable repo list with fixed max height
- Select-all / deselect-all for currently visible (filtered) repos
- Selected count + sticky **Connect selected** footer
- All existing connect/import behavior unchanged

**Out of scope:**
- Backend or API changes
- Org/owner grouping, avatars, privacy badges
- Server-side search
- Tier-limit UI in footer (existing error toast on import failure is sufficient)
- Keyboard shortcuts (e.g. `/` to focus search)
- New component test infrastructure or Storybook

---

## 2. Context

The picker lives in `apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/select/repo-picker.tsx`. Repos are loaded from `GET /workspaces/:id/repositories/github/pending` as `{ id, full_name }[]` stored in the OAuth session after GitHub authorize. Selection is submitted via `POST .../github/import`.

The dashboard uses Chakra UI v3, `PageHeader`, and production tokens from `apps/web/src/theme.ts`. No changes to `apps/web/src/lib/repositories.ts` request logic are required — only the picker UI component.

---

## 3. Approach

**Recommended:** Enhance `repo-picker.tsx` in place (Approach 1).

- Client-side filter on the loaded repo array — no debounce, no new endpoints
- Optionally extract a small `filterRepos(repos, query)` pure helper in the same folder if it keeps the component readable
- Do not extract a generic `RepoSearchList` component (only one consumer today)
- Do not add server-side search (repo count from session is typically tens to low hundreds)

---

## 4. Layout

```
┌─ PageHeader: "Choose repositories" ─────────────────────┐
│  Card (maxW="2xl", full width on mobile)                │
│  ┌─ Search input (LuSearch icon) ──────────────────────┐│
│  ┌─ Select all row ────────────────────────────────────┐│
│  │ ☐ Select all (N visible)                            ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─ Scrollable list (maxH ~360px, overflow-y) ──────────┐│
│  │ ☐ owner/repo-name                                   ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─ Sticky footer (border-top, surface bg) ────────────┐│
│  │  N selected                    [ Connect selected ] ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

- Card retains `maxW="2xl"`
- List area uses `maxH` (~360px) and `overflowY="auto"` so the footer remains visible
- Repo label: parse `full_name` — owner segment muted, repo name default weight (optional polish via string split on `/`)
- Footer: flex row, count left (muted), primary button right

---

## 5. Search

| Behavior | Detail |
|---|---|
| Filter target | `full_name`, case-insensitive substring match |
| Query normalization | Trim whitespace; empty query shows all repos |
| Timing | Instant on each keystroke (no debounce) |
| Input | Chakra `Input` + `InputGroup` with `LuSearch` start element |
| Placeholder | `Search repositories…` |
| Focus | Auto-focus after repos load completes |
| No matches | Inline muted text: `No repositories match your search.` — search field stays visible |

---

## 6. Selection

**Individual checkboxes**
- Selected IDs stored in `Set<number>` (existing pattern)
- Selection persists across search filter changes

**Select-all row**
- Positioned between search input and scrollable list
- Label: `Select all` with muted count `(N visible)` when filtered, `(N)` when unfiltered
- Checkbox states:
  - **Checked** — all visible repos selected
  - **Indeterminate** — some visible repos selected
  - **Unchecked** — no visible repos selected
- Click when not fully checked → add all visible repo IDs to selection
- Click when fully checked → remove all visible repo IDs from selection (off-filter selections preserved)

**Default on load**
- All repos pre-selected (unchanged from current behavior)

**Footer count**
- Shows total selected across entire list: `N selected` / `1 repository selected`
- Connect button disabled when `selected.size === 0`

---

## 7. Footer & connect

- Footer pinned inside card: `borderTopWidth="1px"`, `borderColor="border.muted"`, matching card background
- **Connect selected** button: same import flow, toasts, and redirect as today
- `loading` while submitting; `disabled` when nothing selected
- Tier limit failures: existing error toast (`Your plan may have reached its repository limit`)

---

## 8. States & errors

| State | UI |
|---|---|
| Loading | Muted `Loading your GitHub repositories…`; hide search, list, footer |
| Empty repo list | `No new repositories available to connect.` — no search or footer |
| No search matches | Search + select-all visible; list shows no-match message; select-all disabled when 0 visible |
| Session/API error | Redirect to `.../repositories?error=connect_failed` (unchanged) |
| 403 | `handleForbiddenClient` redirect (unchanged) |

When search filters to zero visible repos but prior selections exist, footer count and Connect button remain valid for off-screen selections.

---

## 9. Files to change

| File | Change |
|---|---|
| `apps/web/.../select/repo-picker.tsx` | Main UI: search, filter, select-all, scroll, sticky footer |
| `apps/web/.../select/filter-repos.ts` | Optional pure helper for filter logic |

No changes to API, `repositories.ts` lib, or session shape.

---

## 10. Testing

**Manual checklist**
1. 5+ repos — scroll works, all pre-selected, footer count correct
2. Search filters instantly by owner or repo name
3. Select-all indeterminate when partially selected visible set
4. Deselect-all visible preserves off-filter selections
5. No-match search message; Connect still works for hidden selections
6. Connect selected — success path and tier-limit error toast

**Automated**
- No new test infrastructure required for v1
- Optional unit test for `filterRepos` if extracted

---

## 11. Success criteria

- User can type to narrow a long repo list without leaving the page
- Select-all operates on filtered results only
- Footer always shows how many repos will be connected
- No backend changes; existing OAuth → picker → import flow unchanged
