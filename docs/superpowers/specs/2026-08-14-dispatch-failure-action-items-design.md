# Dispatch Failure Action Items Design

**Date:** 2026-08-14  
**Status:** Approved for planning  
**Apps:** `shipshout-api-svc`, `shipshout-client-dashboard`  
**Libraries:** `@shipshout/api-client`, `@shipshout/database`  
**Related specs:** [`2026-08-14-dashboard-home-design.md`](2026-08-14-dashboard-home-design.md)  
**Package manager:** bun

## Goal

Stop showing **"Dispatch issue"** on the dashboard home page when no channel actually failed to dispatch. A dispatch issue should only appear when at least one **configured** channel attempted delivery and logged `status: 'failed'`.

Fix both:

1. **Backend** — shoutout final status after publish should not be `failed` when every channel was skipped (not configured).
2. **Dashboard** — home action items should use dispatch log failures, not shoutout status alone.

## Background

The home page `DashboardHomeUtils.buildActionItems` treats any shoutout with status `failed` or `partially_published` as a dispatch issue. Users see false positives such as:

- *Dispatch issue: Push to main*
- *Dispatch issue: Tag v0.0.5*

These shoutouts often have dispatch logs where every channel is `skipped` (disabled, not on plan, or not implemented) — not `failed`. The backend sets shoutout status to `failed` whenever `sentCount === 0`, including the all-skipped case:

```typescript
if (sentCount === 0) return 'failed';
```

Dispatch logs already distinguish outcomes: `sent`, `failed`, `skipped`. Skipped means the channel was not configured or not attempted. Failed means delivery was attempted and errored (e.g. Resend down, invalid recipients).

The list API does not expose dispatch log data today; only the detail endpoint includes `dispatchLogs`.

## Decisions

| Topic | Choice |
| --- | --- |
| Scope | Backend status semantics **and** dashboard action item logic (option C) |
| Dispatch issue definition | Any dispatch log row with `status === 'failed'` for the shoutout |
| Skipped channels | Not a dispatch issue; not a shoutout-level `failed` outcome |
| All-skipped after publish | Final status → `ready_for_review` (user can configure channels and publish again) |
| List API enrichment | Add `hasDispatchFailure: boolean` to `ShoutoutResponseDto` |
| Home page fetching | Use list field only — no N+1 dispatch log fetches |
| Historical data backfill | Out of scope for v1 |
| Shoutouts list UI | No changes — badges improve going forward via backend status fix |

## Approach

**Recommended:** Update `computeFinalStatus`, add batch `hasDispatchFailure` on list, update `DashboardHomeUtils.buildActionItems` to use the flag.

Alternatives considered:

1. **Dashboard-only** — filter via N+1 detail fetches or status heuristics; rejected (wrong stored status remains).
2. **Backend-only** — fix status but home still keys off status; rejected (partially_published with only skipped channels could still false-positive).
3. **Full backfill migration** — recompute all historical statuses; deferred to follow-up if needed.

## Backend: `computeFinalStatus`

Count dispatch results as `sent`, `failed`, `skipped`:

| Condition | Final shoutout status |
| --- | --- |
| No publish channel types in catalog | `failed` (edge case) |
| `failed > 0` and `sent === 0` | `failed` |
| `failed > 0` and `sent > 0` | `partially_published` |
| `sent > 0` and `failed === 0` | `published` (includes sent + skipped mix) |
| `sent === 0` and `failed === 0` (all skipped) | `ready_for_review` |

**Rationale:** Skipped channels were not configured or not attempted — not errors. All-skipped means publish completed with nothing deliverable; return to `ready_for_review` so the user can enable channels and publish again.

### Status transition

Allow `publishing → ready_for_review` in `ShoutoutStatusUtils`:

```typescript
publishing: ['published', 'partially_published', 'failed', 'ready_for_review'],
```

## Backend: list API enrichment

### DTO

Add to `ShoutoutResponseDto`:

```typescript
@ApiProperty({
    example: false,
    description: 'True when at least one dispatch log for this shoutout has status failed',
})
hasDispatchFailure!: boolean;
```

### Repository

Add to `ShoutoutDispatchLogRepository`:

```typescript
findFailureFlagsByShoutoutIds(shoutoutIds: string[]): Promise<Set<string>>;
```

Returns shoutout IDs that have at least one dispatch log with `status = 'failed'`.

### Service

In `ShoutoutService.listForUser`:

1. Load shoutouts for user (existing).
2. Batch-query failure flags for all shoutout IDs.
3. Set `hasDispatchFailure: failureIds.has(shoutout.id)` on each list DTO.

Detail DTO unchanged — still includes full `dispatchLogs`.

## Dashboard: action items

### `ShoutoutHomeRow`

Extend type in `dashboard-home.utils.ts`:

```typescript
export type ShoutoutHomeRow = {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    hasDispatchFailure: boolean;
};
```

### `buildActionItems`

Replace status-based dispatch detection:

```typescript
// Remove
if (shoutout.status === 'failed' || shoutout.status === 'partially_published')

// Add
if (shoutout.hasDispatchFailure)
    items.push({ message: `Dispatch issue: ${shoutout.title}`, href: `/dashboard/shoutouts/${shoutout.id}` });
```

**Priority order (unchanged except dispatch gate):**

1. Webhook errors — `webhook.status === 'error'`
2. `generation_failed`
3. `hasDispatchFailure` — dispatch issue
4. `ready_for_review` — draft ready to publish

Cap remains 5 items.

### Home page

`dashboard/page.tsx` passes shoutouts from `ShoutoutsApi.fetchAll()` including `hasDispatchFailure`. No additional API calls.

## OpenAPI / client

Regenerate `@shipshout/api-client` after DTO change so dashboard uses typed `hasDispatchFailure`.

## Files to change

| File | Change |
| --- | --- |
| `apps/shipshout-api-svc/src/app/shoutout/services/shoutout-dispatch.service.ts` | Update `computeFinalStatus` |
| `apps/shipshout-api-svc/src/app/shoutout/utils/shoutout-status.utils.ts` | Allow `publishing → ready_for_review` |
| `apps/shipshout-api-svc/src/app/shoutout/dto/shoutout.dto.ts` | Add `hasDispatchFailure` |
| `apps/shipshout-api-svc/src/app/shoutout/repositories/shoutout-dispatch-log.repository.ts` | Add `findFailureFlagsByShoutoutIds` |
| `apps/shipshout-api-svc/src/app/shoutout/services/shoutout.service.ts` | Populate flag in list |
| `apps/shipshout-api-svc/src/app/shoutout/__tests__/shoutout-dispatch.service.spec.ts` | Update status expectations |
| `apps/shipshout-api-svc/src/app/shoutout/__tests__/shoutout-status.utils.spec.ts` | New transition test |
| `apps/shipshout-api-svc/src/app/shoutout/__tests__/shoutout.service.spec.ts` | List flag tests (create if missing) |
| `libs/api-client/**` | Regenerated SDK |
| `apps/shipshout-client-dashboard/src/lib/dashboard/dashboard-home.utils.ts` | Use `hasDispatchFailure` |
| `apps/shipshout-client-dashboard/src/lib/dashboard/__tests__/dashboard-home.utils.spec.ts` | Update action item tests |

## Non-goals (v1)

- Backfill/migration for historical shoutout statuses
- Dispatch log detail UI changes
- New shoutout status enum value
- Home page N+1 fetches for dispatch logs
- Changes to webhook / generation / draft action item rules

## Testing

### API

- `computeFinalStatus`: all-skipped → `ready_for_review`; sent+skipped → `published`; sent+failed → `partially_published`; all-failed → `failed`
- `ShoutoutStatusUtils`: `publishing → ready_for_review` allowed
- `listForUser`: `hasDispatchFailure` true only when a log has `failed`

### Dashboard

- `status: 'failed'` + `hasDispatchFailure: false` → no dispatch action item
- `hasDispatchFailure: true` → dispatch action item present
- Priority/cap behavior unchanged

### Manual

- Publish with no enabled channels → no home dispatch issue; shoutout returns to ready for review
- Publish with enabled channel + send error → home shows dispatch issue

## Self-review

- [x] No placeholder sections
- [x] Backend and dashboard changes aligned (option C)
- [x] Dispatch issue definition matches user intent (configured channel failed, not skipped)
- [x] List enrichment avoids N+1 on home page
- [x] Historical backfill explicitly out of scope
- [x] Status transition for all-skipped case documented
