# Global Repository Link Uniqueness Design

**Date:** 2026-08-14  
**Status:** Approved for planning  
**Apps:** `shipshout-api-svc`, `shipshout-client-dashboard`  
**Libraries:** `@shipshout/database`, `@shipshout/api-client`  
**Design system:** [`DESIGN.md`](../../../DESIGN.md)  
**Package manager:** bun

## Goal

Prevent multiple ShipShout accounts from linking the same GitHub repository. Enforce the rule at link time with a clear API error, show claimed repos as disabled in the dashboard UI, and dedupe any existing duplicate links (keeping the earliest link per repo).

## Background

Today `linked_repositories` enforces uniqueness on `(user_id, github_repo_id)` only. The same `github_repo_id` can exist for multiple users. Each link registers a separate GitHub webhook; webhook ingest deduplicates on `github_delivery_id` globally, so only the first processed delivery wins and other accounts silently miss triggers.

## Decisions

| Topic | Choice |
| --- | --- |
| Ownership model | One GitHub repo → one ShipShout account at a time, no exceptions |
| Existing duplicates | Keep earliest `linked_at`; unlink and clean up later duplicates |
| UI for claimed repos | Show in list, disabled checkbox, note badge (do not hide) |
| Enforcement layers | App guard + global DB unique index on `github_repo_id` |
| Conflict response | `409 Conflict` with repo `fullName` in message |
| Webhook dedup fix | Out of scope (separate work); this prevents the root cause going forward |

## Approach

**Recommended:** DB unique index + application guard + list enrichment + one-time dedupe with GitHub webhook cleanup.

Alternatives considered:

1. **Application check only** — simpler but race-prone; does not durably enforce the rule.
2. **Lazy enforcement (new links only)** — leaves existing broken duplicate state in place; rejected.

## Data model & migration

### Schema change

Add a global unique index on `github_repo_id` in `LinkedRepositoryEntity`:

```typescript
@Index('uq_linked_repositories_github_repo', ['githubRepoId'], { unique: true })
```

Keep the existing `(userId, githubRepoId)` unique index for per-user lookups.

### One-time dedupe (before unique index)

For each `github_repo_id` with more than one row:

1. **Keeper:** row with earliest `linked_at`.
2. **Duplicates:** all other rows for that `github_repo_id`.

For each duplicate row:

1. Call `TriggerLifecycleService.cleanupLinkedRepository(userId, id)` — best-effort GitHub webhook deletion via the duplicate owner's token.
2. Delete the `linked_repositories` row (DB cascades remove triggers, webhooks, channels, and shoutouts for that link).

Implementation lives in a `RepositoryMaintenanceService` (or equivalent) invoked once at deploy/bootstrap — not raw SQL-only migration, because webhook cleanup requires GitHub API access and user tokens.

If webhook deletion fails (revoked token, network error): log a warning and continue with DB deletion.

After dedupe completes, apply a TypeORM migration that adds `uq_linked_repositories_github_repo`.

## API

### DTO change

Extend `GithubRepoDto`:

```typescript
@ApiProperty({
    example: false,
    description: 'Whether another ShipShout account has already linked this repository',
})
claimedByOtherAccount!: boolean;
```

Regenerate `@shipshout/api-client` after the OpenAPI change.

### `listAvailableRepos`

1. Fetch accessible repos from GitHub (unchanged).
2. Mark `linked: true` for repos already linked by the current user.
3. Query `linked_repositories` for `github_repo_id IN (...)` where `user_id != :userId`.
4. Set `claimedByOtherAccount: true` for repos in that set (unless `linked` is already true for the current user).

Return all accessible repos; do not filter out claimed repos server-side.

### `linkRepositories` guard

Before `saveLinked` for each requested `githubId`:

1. Existing validation unchanged (repo accessible via connected GitHub account).
2. If another user already owns this `github_repo_id` → `ConflictException`:

   > `Repository {fullName} is already linked to another ShipShout account.`

3. If the current user already linked the repo → idempotent save (existing behavior).

4. On unique-index violation from a concurrent link race → catch and map to the same `409` message.

### Repository helper

Add to `LinkedRepositoryRepository`:

```typescript
findClaimedGithubRepoIds(githubRepoIds: string[], excludeUserId: string): Promise<Set<string>>
```

## Dashboard UI

**File:** `apps/shipshout-client-dashboard/src/components/repositories/repositories-client.tsx`

### Selectability

```typescript
const isSelectable = (repo) => !repo.linked && !repo.claimedByOtherAccount;
```

- Own linked repos: remain in the "Linked" section only (unchanged).
- Claimed-by-other repos: visible in the add table; checkbox disabled; row not clickable.

### Visual treatment

- Disabled checkbox (`disabled`, no selection handler).
- Muted row styling (`opacity` / `color="fg.muted"`).
- Badge or note: **"Linked to another account"** — do not expose the other account's email.

### Bulk actions

- "Select all" and row toggles skip non-selectable repos.
- API `409` on link attempt surfaces via existing toast: title **"Could not link repositories"**, description = API message.

### Filters

Claimed repos remain visible and searchable in the add table.

## Error handling

| Case | Response | UI |
| --- | --- | --- |
| Repo claimed by another account | `409 Conflict` | Toast; row disabled in list |
| Concurrent link race | DB unique violation → `409` | Same toast |
| Dedupe: webhook delete fails | Log warning; continue DB delete | N/A (background) |
| Dedupe: no GitHub connection for duplicate user | Skip webhook delete; delete DB row | N/A (background) |

## Testing

**API (`repository.service.spec.ts`):**

- `listAvailableRepos` sets `claimedByOtherAccount: true` when another user owns the repo.
- `linkRepositories` throws `409` when repo is claimed elsewhere.
- `linkRepositories` succeeds for an unclaimed repo.
- Own already-linked repo remains idempotent.

Dashboard: manual verification of disabled checkbox and badge copy; no new test file required unless an existing component test covers this page.

## Out of scope

- Scoping webhook ingest dedup to `(github_delivery_id, linked_repository_id)`.
- Team/shared repo access or admin override.
- Notifying the owning account when another user attempts to link the same repo.

## Success criteria

1. A second ShipShout account cannot link a repo already linked elsewhere (API + DB enforced).
2. Claimed repos appear disabled in the UI with clear copy.
3. Existing duplicate links are deduped (earliest wins); duplicate GitHub webhooks cleaned up best-effort.
4. Global unique index prevents future duplicates.

## Flow

```
User opens /dashboard/repositories
        │
        ▼
GET /repositories/available
  • linked = own links
  • claimedByOtherAccount = owned by another user
        │
        ▼
UI shows claimed repos disabled ("Linked to another account")
        │
        ▼
User selects unclaimed repos → POST /repositories/link
        │
        ├─ unclaimed → save + seed triggers/channels
        └─ claimed elsewhere → 409 Conflict → toast
```
