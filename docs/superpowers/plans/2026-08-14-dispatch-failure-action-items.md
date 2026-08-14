# Dispatch Failure Action Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Only show dashboard "Dispatch issue" action items when a dispatch log has `status: 'failed'`, and fix backend final status so all-skipped publishes are not stored as `failed`.

**Architecture:** Update `ShoutoutDispatchService.computeFinalStatus` and allow `publishing → ready_for_review`. Enrich list DTOs with batch-computed `hasDispatchFailure`. Dashboard `DashboardHomeUtils.buildActionItems` gates on that flag instead of shoutout status.

**Tech Stack:** NestJS 11, TypeORM, Next.js dashboard, `@shipshout/api-client`, bun, Jest

**Spec:** [`docs/superpowers/specs/2026-08-14-dispatch-failure-action-items-design.md`](../specs/2026-08-14-dispatch-failure-action-items-design.md)

## Global Constraints

- Dispatch issue = any dispatch log row with `status === 'failed'` for the shoutout.
- Skipped channels are not dispatch failures.
- All-skipped after publish → final status `ready_for_review` (not `failed`).
- List API adds `hasDispatchFailure: boolean`; home page uses list field only — no N+1 dispatch log fetches.
- Historical shoutout status backfill is **out of scope**.
- Static helpers on utility classes where logic is reusable; Nest services/repos stay injectable.
- Prettier: 4-space, single quotes, printWidth 160; single-statement `if` without braces.
- Regenerate `@shipshout/api-client` after DTO change (`bun run openapi:generate` with API serving OpenAPI).

## File map

| File | Responsibility |
| --- | --- |
| `apps/shipshout-api-svc/src/app/shoutout/services/shoutout-dispatch.service.ts` | New `computeFinalStatus` rules |
| `apps/shipshout-api-svc/src/app/shoutout/utils/shoutout-status.utils.ts` | Allow `publishing → ready_for_review` |
| `apps/shipshout-api-svc/src/app/shoutout/__tests__/shoutout-dispatch.service.spec.ts` | Status matrix tests |
| `apps/shipshout-api-svc/src/app/shoutout/__tests__/shoutout-status.utils.spec.ts` | Transition test |
| `apps/shipshout-api-svc/src/app/shoutout/dto/shoutout.dto.ts` | Add `hasDispatchFailure` to `ShoutoutResponseDto` |
| `apps/shipshout-api-svc/src/app/shoutout/repositories/shoutout-dispatch-log.repository.ts` | `findFailureFlagsByShoutoutIds` |
| `apps/shipshout-api-svc/src/app/shoutout/services/shoutout.service.ts` | Populate flag in list + detail |
| `apps/shipshout-api-svc/src/app/shoutout/__tests__/shoutout.service.spec.ts` | List flag unit tests (new) |
| `libs/api-client/src/lib/client/**` | Regenerated SDK |
| `apps/shipshout-client-dashboard/src/lib/dashboard/dashboard-home.utils.ts` | Gate action items on flag |
| `apps/shipshout-client-dashboard/src/lib/dashboard/__tests__/dashboard-home.utils.spec.ts` | Updated action item tests |

---

### Task 1: Fix `computeFinalStatus` and status transitions

**Files:**

- Modify: `apps/shipshout-api-svc/src/app/shoutout/services/shoutout-dispatch.service.ts`
- Modify: `apps/shipshout-api-svc/src/app/shoutout/utils/shoutout-status.utils.ts`
- Modify: `apps/shipshout-api-svc/src/app/shoutout/__tests__/shoutout-dispatch.service.spec.ts`
- Modify: `apps/shipshout-api-svc/src/app/shoutout/__tests__/shoutout-status.utils.spec.ts`

**Interfaces:**

- Produces: `ShoutoutDispatchService.computeFinalStatus(results: ShoutoutDispatchStatus[]): ShoutoutStatus` with new rules
- Produces: `ShoutoutStatusUtils.canTransition('publishing', 'ready_for_review') === true`

- [ ] **Step 1: Update failing tests in `shoutout-dispatch.service.spec.ts`**

Change the all-skipped test expectation:

```typescript
it('returns ready_for_review when all channels are skipped', async () => {
    // ... existing setup with disabled/unentitled channel ...
    expect(shoutouts.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'ready_for_review' }));
});
```

Add to `describe('ShoutoutDispatchService.computeFinalStatus')`:

```typescript
it('returns ready_for_review when all channels skipped', () => {
    expect(ShoutoutDispatchService.computeFinalStatus(['skipped', 'skipped'])).toBe('ready_for_review');
});

it('returns published when some sent and rest skipped with no failures', () => {
    expect(ShoutoutDispatchService.computeFinalStatus(['sent', 'skipped'])).toBe('published');
});

it('returns failed when all channels failed', () => {
    expect(ShoutoutDispatchService.computeFinalStatus(['failed', 'skipped'])).toBe('failed');
});
```

Update existing test:

```typescript
it('returns partially_published when some channels sent and some failed', () => {
    expect(ShoutoutDispatchService.computeFinalStatus(['sent', 'failed'])).toBe('partially_published');
});
```

Remove/replace old test that expected `partially_published` for `['sent', 'skipped']` if present in computeFinalStatus block.

Add to `shoutout-status.utils.spec.ts`:

```typescript
it('allows publishing to ready_for_review', () => {
    expect(ShoutoutStatusUtils.canTransition('publishing', 'ready_for_review')).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun nx test @shipshout/shipshout-api-svc --testPathPattern="shoutout-dispatch.service.spec|shoutout-status.utils.spec"`
Expected: FAIL on new expectations

- [ ] **Step 3: Implement new `computeFinalStatus`**

```typescript
static computeFinalStatus(results: ShoutoutDispatchStatus[]): ShoutoutStatus {
    if (results.length === 0) return 'failed';
    const sentCount = results.filter((status) => status === 'sent').length;
    const failedCount = results.filter((status) => status === 'failed').length;
    if (failedCount > 0 && sentCount === 0) return 'failed';
    if (failedCount > 0 && sentCount > 0) return 'partially_published';
    if (sentCount > 0) return 'published';
    return 'ready_for_review';
}
```

Update `shoutout-status.utils.ts`:

```typescript
publishing: ['published', 'partially_published', 'failed', 'ready_for_review'],
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun nx test @shipshout/shipshout-api-svc --testPathPattern="shoutout-dispatch.service.spec|shoutout-status.utils.spec"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/shipshout-api-svc/src/app/shoutout/services/shoutout-dispatch.service.ts apps/shipshout-api-svc/src/app/shoutout/utils/shoutout-status.utils.ts apps/shipshout-api-svc/src/app/shoutout/__tests__/shoutout-dispatch.service.spec.ts apps/shipshout-api-svc/src/app/shoutout/__tests__/shoutout-status.utils.spec.ts
git commit -m "fix(shoutout): treat all-skipped dispatch as ready_for_review, not failed."
```

---

### Task 2: Add `hasDispatchFailure` to list API

**Files:**

- Modify: `apps/shipshout-api-svc/src/app/shoutout/dto/shoutout.dto.ts`
- Modify: `apps/shipshout-api-svc/src/app/shoutout/repositories/shoutout-dispatch-log.repository.ts`
- Modify: `apps/shipshout-api-svc/src/app/shoutout/services/shoutout.service.ts`
- Create: `apps/shipshout-api-svc/src/app/shoutout/__tests__/shoutout.service.spec.ts`

**Interfaces:**

- Produces: `ShoutoutDispatchLogRepository.findFailureFlagsByShoutoutIds(shoutoutIds: string[]): Promise<Set<string>>`
- Produces: `ShoutoutResponseDto.hasDispatchFailure: boolean`
- Produces: `ShoutoutService.listForUser` sets flag via batch query

- [ ] **Step 1: Write failing test**

Create `shoutout.service.spec.ts`:

```typescript
import { ShoutoutEntity } from '@shipshout/database';
import { ShoutoutChannelDraftRepository } from '../repositories/shoutout-channel-draft.repository';
import { ShoutoutDispatchLogRepository } from '../repositories/shoutout-dispatch-log.repository';
import { ShoutoutRepository } from '../repositories/shoutout.repository';
import { ShoutoutService } from '../services/shoutout.service';
import { ShoutoutEventsService } from '../services/shoutout-events.service';
import { ShoutoutQueueService } from '../services/shoutout-queue.service';

describe('ShoutoutService.listForUser', () => {
    const shoutout: ShoutoutEntity = {
        id: 'shoutout-1',
        userId: 'user-1',
        linkedRepositoryId: 'repo-1',
        triggerEventId: 'event-1',
        title: 'Release v1',
        status: 'failed',
        sourceSummary: {},
        createdAt: new Date('2026-08-12T00:00:00.000Z'),
        linkedRepository: { fullName: 'acme/app' } as ShoutoutEntity['linkedRepository'],
        triggerEvent: { triggerType: 'release' } as ShoutoutEntity['triggerEvent'],
    };

    const shoutouts = { findByUserId: jest.fn() };
    const drafts = { findByShoutoutId: jest.fn() };
    const dispatchLogs = { findFailureFlagsByShoutoutIds: jest.fn() };
    const events = { publish: jest.fn(), subscribe: jest.fn() };
    const queue = { addDispatchJob: jest.fn(), addGenerationJob: jest.fn() };

    let service: ShoutoutService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new ShoutoutService(
            shoutouts as unknown as ShoutoutRepository,
            drafts as unknown as ShoutoutChannelDraftRepository,
            dispatchLogs as unknown as ShoutoutDispatchLogRepository,
            events as unknown as ShoutoutEventsService,
            queue as unknown as ShoutoutQueueService,
        );
    });

    it('sets hasDispatchFailure true when failure flags include shoutout id', async () => {
        shoutouts.findByUserId.mockResolvedValue([shoutout]);
        dispatchLogs.findFailureFlagsByShoutoutIds.mockResolvedValue(new Set(['shoutout-1']));

        const result = await service.listForUser('user-1');

        expect(dispatchLogs.findFailureFlagsByShoutoutIds).toHaveBeenCalledWith(['shoutout-1']);
        expect(result.shoutouts[0].hasDispatchFailure).toBe(true);
    });

    it('sets hasDispatchFailure false when shoutout has no failed dispatch logs', async () => {
        shoutouts.findByUserId.mockResolvedValue([shoutout]);
        dispatchLogs.findFailureFlagsByShoutoutIds.mockResolvedValue(new Set());

        const result = await service.listForUser('user-1');

        expect(result.shoutouts[0].hasDispatchFailure).toBe(false);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun nx test @shipshout/shipshout-api-svc --testPathPattern=shoutout.service.spec`
Expected: FAIL — `findFailureFlagsByShoutoutIds` or `hasDispatchFailure` missing

- [ ] **Step 3: Implement DTO, repository, and service**

`shoutout.dto.ts` — add to `ShoutoutResponseDto`:

```typescript
@ApiProperty({
    example: false,
    description: 'True when at least one dispatch log for this shoutout has status failed',
})
hasDispatchFailure!: boolean;
```

`shoutout-dispatch-log.repository.ts`:

```typescript
async findFailureFlagsByShoutoutIds(shoutoutIds: string[]): Promise<Set<string>> {
    if (shoutoutIds.length === 0) return new Set();
    const rows = await this.createQueryBuilder('log')
        .select('log.shoutout_id', 'shoutoutId')
        .where('log.shoutout_id IN (:...shoutoutIds)', { shoutoutIds })
        .andWhere('log.status = :status', { status: 'failed' })
        .groupBy('log.shoutout_id')
        .getRawMany<{ shoutoutId: string }>();
    return new Set(rows.map((row) => row.shoutoutId));
}
```

`shoutout.service.ts`:

```typescript
async listForUser(userId: string): Promise<ShoutoutListResponseDto> {
    const rows = await this.shoutouts.findByUserId(userId);
    const failureIds = await this.dispatchLogs.findFailureFlagsByShoutoutIds(rows.map((row) => row.id));
    return { shoutouts: rows.map((row) => this.toListDto(row, failureIds.has(row.id))) };
}

private toListDto(shoutout: ShoutoutEntity, hasDispatchFailure = false): ShoutoutResponseDto {
    return {
        id: shoutout.id,
        title: shoutout.title,
        status: shoutout.status,
        linkedRepositoryId: shoutout.linkedRepositoryId,
        repositoryFullName: shoutout.linkedRepository?.fullName ?? 'Unknown repository',
        triggerType: shoutout.triggerEvent?.triggerType ?? 'release',
        createdAt: shoutout.createdAt.toISOString(),
        hasDispatchFailure,
    };
}
```

Update `toDetailDto` to compute flag from logs:

```typescript
return {
    ...this.toListDto(shoutout, logRows.some((row) => row.status === 'failed')),
    // ... rest unchanged
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun nx test @shipshout/shipshout-api-svc --testPathPattern=shoutout.service.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/shipshout-api-svc/src/app/shoutout/dto/shoutout.dto.ts apps/shipshout-api-svc/src/app/shoutout/repositories/shoutout-dispatch-log.repository.ts apps/shipshout-api-svc/src/app/shoutout/services/shoutout.service.ts apps/shipshout-api-svc/src/app/shoutout/__tests__/shoutout.service.spec.ts
git commit -m "feat(shoutout): expose hasDispatchFailure on shoutout list responses."
```

---

### Task 3: Regenerate API client

**Files:**

- Modify: `libs/api-client/src/lib/client/**` (generated)

**Interfaces:**

- Produces: `ShoutoutResponseDto.hasDispatchFailure: boolean` in `@shipshout/api-client`

- [ ] **Step 1: Build and serve API (or use running instance)**

Run: `bun nx serve @shipshout/shipshout-api-svc` (background; wait for OpenAPI at `http://localhost:8000/docs/openapi.json`)

- [ ] **Step 2: Regenerate client**

Run: `bun run openapi:generate`
Expected: `ShoutoutResponseDto` includes `hasDispatchFailure: boolean`

- [ ] **Step 3: Commit**

```bash
git add libs/api-client/src/lib/client/
git commit -m "chore(api-client): regenerate OpenAPI client for hasDispatchFailure."
```

---

### Task 4: Dashboard action items

**Files:**

- Modify: `apps/shipshout-client-dashboard/src/lib/dashboard/dashboard-home.utils.ts`
- Modify: `apps/shipshout-client-dashboard/src/lib/dashboard/__tests__/dashboard-home.utils.spec.ts`

**Interfaces:**

- Consumes: `ShoutoutResponseDto.hasDispatchFailure` from list API
- Produces: `ShoutoutHomeRow.hasDispatchFailure`; dispatch action items only when `true`

- [ ] **Step 1: Update failing tests**

Extend `ShoutoutHomeRow` usages in tests — add `hasDispatchFailure: false` to existing shoutout fixtures in priority test.

Add new tests:

```typescript
it('does not add dispatch issue when status is failed but hasDispatchFailure is false', () => {
    const items = DashboardHomeUtils.buildActionItems([], [
        { id: 's1', title: 'Push to main', status: 'failed', createdAt: '2026-08-14T10:00:00.000Z', hasDispatchFailure: false },
    ]);
    expect(items.some((item) => item.message.includes('Dispatch issue'))).toBe(false);
});

it('adds dispatch issue when hasDispatchFailure is true', () => {
    const items = DashboardHomeUtils.buildActionItems([], [
        { id: 's1', title: 'Tag v0.0.5', status: 'partially_published', createdAt: '2026-08-14T10:00:00.000Z', hasDispatchFailure: true },
    ]);
    expect(items[0].message).toBe('Dispatch issue: Tag v0.0.5');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun nx run shipshout-client-dashboard:test --testPathPatterns=dashboard-home.utils.spec`
Expected: FAIL on new expectations / missing field

- [ ] **Step 3: Implement utils change**

Add to `ShoutoutHomeRow`:

```typescript
hasDispatchFailure: boolean;
```

Replace dispatch loop:

```typescript
for (const shoutout of shoutouts) {
    if (!shoutout.hasDispatchFailure) continue;
    items.push({ message: `Dispatch issue: ${shoutout.title}`, href: `/dashboard/shoutouts/${shoutout.id}` });
}
```

Remove the old loop checking `status === 'failed' || status === 'partially_published'`.

`dashboard/page.tsx` requires no change if it passes shoutouts from API directly (field flows through).

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun nx run shipshout-client-dashboard:test --testPathPatterns=dashboard-home.utils.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/shipshout-client-dashboard/src/lib/dashboard/dashboard-home.utils.ts apps/shipshout-client-dashboard/src/lib/dashboard/__tests__/dashboard-home.utils.spec.ts
git commit -m "fix(dashboard): gate dispatch action items on hasDispatchFailure."
```

---

### Task 5: Verification

**Files:** none (verification only)

- [ ] **Step 1: Run API shoutout tests**

Run: `bun nx test @shipshout/shipshout-api-svc --testPathPattern=shoutout`
Expected: PASS

- [ ] **Step 2: Run dashboard tests + build**

Run: `bun nx run shipshout-client-dashboard:test --silent`
Run: `bun nx run shipshout-client-dashboard:build`
Expected: PASS

- [ ] **Step 3: Manual smoke**

1. Shoutouts with all-skipped logs → no home "Dispatch issue"; new publishes return to ready for review.
2. Shoutout with a failed dispatch log → home shows "Dispatch issue".

---

## Self-review

| Spec requirement | Task |
| --- | --- |
| `computeFinalStatus` new rules | Task 1 |
| `publishing → ready_for_review` | Task 1 |
| `hasDispatchFailure` on list DTO | Task 2 |
| Batch failure flag query | Task 2 |
| OpenAPI regen | Task 3 |
| Dashboard gates on flag | Task 4 |
| No backfill | Non-goal (no task) |
| No home N+1 | Task 4 (uses list field) |

No placeholders. `hasDispatchFailure` consistent across DTO, service, utils, and tests.
