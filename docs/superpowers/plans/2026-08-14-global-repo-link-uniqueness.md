# Global Repository Link Uniqueness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce one GitHub repo per ShipShout account at link time, dedupe existing duplicates (earliest wins), and show claimed repos as disabled in the dashboard.

**Architecture:** `RepositoryLinkDedupeSeed` runs on API boot (before/with migration) to remove duplicate links and clean up GitHub webhooks. Application guard in `RepositoryService` plus global unique index on `github_repo_id`. Dashboard reads new `claimedByOtherAccount` flag from OpenAPI.

**Tech Stack:** NestJS 11, TypeORM, Next.js dashboard, Chakra UI v3, bun, Jest, `@shipshout/api-client`

**Spec:** [`docs/superpowers/specs/2026-08-14-global-repo-link-uniqueness-design.md`](../specs/2026-08-14-global-repo-link-uniqueness-design.md)

## Global Constraints

- One GitHub repo → one ShipShout account at a time; no team/shared exceptions.
- Existing duplicates: keep earliest `linked_at`; unlink later duplicates with webhook cleanup.
- Claimed repos: visible in add table, disabled checkbox, badge **"Linked to another account"** (no other user's email).
- Conflict response: `409 Conflict` — `Repository {fullName} is already linked to another ShipShout account.`
- Static helpers on utility classes where logic is reusable (`RepositoryMaintenanceUtils`); Nest lifecycle stays in injectable seeds/services.
- Prettier: 4-space, single quotes, printWidth 160; single-statement `if` without braces.
- Follow [`DESIGN.md`](../../../DESIGN.md) for dashboard UI tokens.
- Webhook ingest dedup scoping is **out of scope**.

## File map

| File | Responsibility |
| --- | --- |
| `libs/database/src/lib/entities/linked-repository.entity.ts` | Add global unique index on `githubRepoId` |
| `libs/database/src/lib/migrations/<ts>-Migration.ts` | Add `uq_linked_repositories_github_repo` (run after dedupe) |
| `apps/shipshout-api-svc/src/app/repository/repositories/linked-repository.repository.ts` | `findClaimedGithubRepoIds`, `findDuplicateGroups`, `deleteById` |
| `apps/shipshout-api-svc/src/app/repository/utils/repository-maintenance.utils.ts` | Pure duplicate selection (keeper vs removals) |
| `apps/shipshout-api-svc/src/app/repository/repository-link-dedupe.seed.ts` | `OnModuleInit` dedupe + webhook cleanup |
| `apps/shipshout-api-svc/src/app/trigger/trigger.module.ts` | Register dedupe seed (has `TriggerLifecycleService`) |
| `apps/shipshout-api-svc/src/app/repository/dto/github-repo.dto.ts` | Add `claimedByOtherAccount` |
| `apps/shipshout-api-svc/src/app/repository/services/repository.service.ts` | List enrichment + link guard + race handling |
| `apps/shipshout-api-svc/src/app/repository/__tests__/repository.service.spec.ts` | Unit tests for guard and list flag |
| `apps/shipshout-api-svc/src/app/repository/__tests__/repository-maintenance.utils.spec.ts` | Unit tests for keeper selection |
| `libs/api-client/src/lib/client/**` | Regenerated SDK types |
| `apps/shipshout-client-dashboard/src/components/repositories/repositories-client.tsx` | Disabled rows + badge |

---

### Task 1: Repository query helpers + maintenance utils

**Files:**

- Modify: `apps/shipshout-api-svc/src/app/repository/repositories/linked-repository.repository.ts`
- Create: `apps/shipshout-api-svc/src/app/repository/utils/repository-maintenance.utils.ts`
- Create: `apps/shipshout-api-svc/src/app/repository/__tests__/repository-maintenance.utils.spec.ts`

**Interfaces:**

- Produces:
  - `LinkedRepositoryRepository.findClaimedGithubRepoIds(githubRepoIds: string[], excludeUserId: string): Promise<Set<string>>`
  - `LinkedRepositoryRepository.findDuplicateGroups(): Promise<LinkedRepositoryEntity[][]>` — groups with `length > 1`, each group sorted by `linkedAt ASC`
  - `LinkedRepositoryRepository.deleteById(id: string): Promise<void>`
  - `RepositoryMaintenanceUtils.selectKeeperAndDuplicates(group: LinkedRepositoryEntity[]): { keeper: LinkedRepositoryEntity; duplicates: LinkedRepositoryEntity[] }`

- [ ] **Step 1: Write failing test for keeper selection**

```typescript
import { LinkedRepositoryEntity } from '@shipshout/database';
import { RepositoryMaintenanceUtils } from '../utils/repository-maintenance.utils';

describe('RepositoryMaintenanceUtils', () => {
    const row = (id: string, linkedAt: Date): LinkedRepositoryEntity =>
        ({ id, linkedAt }) as LinkedRepositoryEntity;

    it('keeps earliest linkedAt and marks later rows as duplicates', () => {
        const group = [row('b', new Date('2026-08-02')), row('a', new Date('2026-08-01')), row('c', new Date('2026-08-03'))];
        const { keeper, duplicates } = RepositoryMaintenanceUtils.selectKeeperAndDuplicates(group);
        expect(keeper.id).toBe('a');
        expect(duplicates.map((r) => r.id)).toEqual(['b', 'c']);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun nx test @shipshout/shipshout-api-svc --testPathPattern=repository-maintenance.utils.spec`
Expected: FAIL — module/class not found

- [ ] **Step 3: Implement utils + repository helpers**

```typescript
// repository-maintenance.utils.ts
import { LinkedRepositoryEntity } from '@shipshout/database';

export class RepositoryMaintenanceUtils {
    static selectKeeperAndDuplicates(group: LinkedRepositoryEntity[]): {
        keeper: LinkedRepositoryEntity;
        duplicates: LinkedRepositoryEntity[];
    } {
        const sorted = [...group].sort((a, b) => a.linkedAt.getTime() - b.linkedAt.getTime());
        return { keeper: sorted[0], duplicates: sorted.slice(1) };
    }
}
```

```typescript
// linked-repository.repository.ts additions
import { In } from 'typeorm';

async findClaimedGithubRepoIds(githubRepoIds: string[], excludeUserId: string): Promise<Set<string>> {
    if (githubRepoIds.length === 0) return new Set();
    const rows = await this.find({
        where: { githubRepoId: In(githubRepoIds), userId: Not(excludeUserId) },
        select: ['githubRepoId'],
    });
    return new Set(rows.map((row) => row.githubRepoId));
}

async findDuplicateGroups(): Promise<LinkedRepositoryEntity[][]> {
    const rows = await this.find({ order: { githubRepoId: 'ASC', linkedAt: 'ASC' } });
    const byGithubRepoId = new Map<string, LinkedRepositoryEntity[]>();
    for (const row of rows) {
        const group = byGithubRepoId.get(row.githubRepoId) ?? [];
        group.push(row);
        byGithubRepoId.set(row.githubRepoId, group);
    }
    return [...byGithubRepoId.values()].filter((group) => group.length > 1);
}

async deleteById(id: string): Promise<void> {
    await this.delete({ id });
}
```

Import `Not` from `typeorm` alongside `In`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun nx test @shipshout/shipshout-api-svc --testPathPattern=repository-maintenance.utils.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/shipshout-api-svc/src/app/repository/repositories/linked-repository.repository.ts \
  apps/shipshout-api-svc/src/app/repository/utils/repository-maintenance.utils.ts \
  apps/shipshout-api-svc/src/app/repository/__tests__/repository-maintenance.utils.spec.ts
git commit -m "feat(repository): add helpers for global repo link uniqueness."
```

---

### Task 2: Boot-time dedupe seed (webhook cleanup + delete duplicates)

**Files:**

- Create: `apps/shipshout-api-svc/src/app/repository/repository-link-dedupe.seed.ts`
- Modify: `apps/shipshout-api-svc/src/app/trigger/trigger.module.ts`

**Interfaces:**

- Consumes: `LinkedRepositoryRepository.findDuplicateGroups`, `deleteById`; `TriggerLifecycleService.cleanupLinkedRepository`; `RepositoryMaintenanceUtils.selectKeeperAndDuplicates`
- Produces: `RepositoryLinkDedupeSeed` registered in `TriggerModule` providers — runs idempotently on every API boot

- [ ] **Step 1: Create dedupe seed**

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LinkedRepositoryRepository } from '../repository/repositories/linked-repository.repository';
import { RepositoryMaintenanceUtils } from '../repository/utils/repository-maintenance.utils';
import { TriggerLifecycleService } from '../trigger/services/trigger-lifecycle.service';

@Injectable()
export class RepositoryLinkDedupeSeed implements OnModuleInit {
    private readonly logger = new Logger(RepositoryLinkDedupeSeed.name);

    constructor(
        private readonly linkedRepositories: LinkedRepositoryRepository,
        private readonly triggerLifecycle: TriggerLifecycleService,
    ) {}

    async onModuleInit(): Promise<void> {
        const groups = await this.linkedRepositories.findDuplicateGroups();
        if (groups.length === 0) return;

        for (const group of groups) {
            const { keeper, duplicates } = RepositoryMaintenanceUtils.selectKeeperAndDuplicates(group);
            this.logger.warn(
                `Deduping github_repo_id=${keeper.githubRepoId}: keeping ${keeper.id} (user ${keeper.userId}), removing ${duplicates.length} duplicate(s)`,
            );
            for (const duplicate of duplicates) {
                try {
                    await this.triggerLifecycle.cleanupLinkedRepository(duplicate.userId, duplicate.id);
                } catch (error) {
                    this.logger.warn(`Webhook cleanup failed for linked repo ${duplicate.id}: ${String(error)}`);
                }
                await this.linkedRepositories.deleteById(duplicate.id);
            }
        }
    }
}
```

- [ ] **Step 2: Register in TriggerModule**

```typescript
import { RepositoryLinkDedupeSeed } from '../repository/repository-link-dedupe.seed';

providers: [
    // ...existing
    RepositoryLinkDedupeSeed,
],
```

- [ ] **Step 3: Build API to verify DI wiring**

Run: `bun nx build @shipshout/shipshout-api-svc`
Expected: PASS

- [ ] **Step 4: Restart local API once to run dedupe against dev DB**

Run: `bun nx serve @shipshout/shipshout-api-svc` (or existing dev process)
Expected: Log line for `samnsimson/shipshout` duplicate removal if still present; only one row per `github_repo_id` remains

- [ ] **Step 5: Commit**

```bash
git add apps/shipshout-api-svc/src/app/repository/repository-link-dedupe.seed.ts \
  apps/shipshout-api-svc/src/app/trigger/trigger.module.ts
git commit -m "feat(repository): dedupe duplicate linked repos on API boot."
```

---

### Task 3: Global unique index migration

**Files:**

- Modify: `libs/database/src/lib/entities/linked-repository.entity.ts`
- Create: `libs/database/src/lib/migrations/<timestamp>-Migration.ts` (via generate or hand-write)

**Interfaces:**

- Produces: DB index `uq_linked_repositories_github_repo` on `linked_repositories.github_repo_id`

- [ ] **Step 1: Add entity index**

```typescript
@Index('uq_linked_repositories_user_github_repo', ['userId', 'githubRepoId'], { unique: true })
@Index('uq_linked_repositories_github_repo', ['githubRepoId'], { unique: true })
export class LinkedRepositoryEntity {
```

- [ ] **Step 2: Confirm no duplicates remain**

Run: `DATABASE_URL=... psql -c "SELECT github_repo_id, COUNT(*) FROM linked_repositories GROUP BY github_repo_id HAVING COUNT(*) > 1;"`
Expected: 0 rows

- [ ] **Step 3: Generate and run migration**

Run: `bun run migration:generate`
Run: `bun run migration:run`
Expected: migration creates `uq_linked_repositories_github_repo`

- [ ] **Step 4: Commit**

```bash
git add libs/database/src/lib/entities/linked-repository.entity.ts libs/database/src/lib/migrations/
git commit -m "feat(database): enforce global unique github_repo_id on linked repos."
```

---

### Task 4: API list enrichment + link guard

**Files:**

- Modify: `apps/shipshout-api-svc/src/app/repository/dto/github-repo.dto.ts`
- Modify: `apps/shipshout-api-svc/src/app/repository/services/repository.service.ts`
- Modify: `apps/shipshout-api-svc/src/app/repository/__tests__/repository.service.spec.ts`

**Interfaces:**

- Consumes: `LinkedRepositoryRepository.findClaimedGithubRepoIds`
- Produces: `GithubRepoDto.claimedByOtherAccount: boolean`; `linkRepositories` throws `ConflictException` when claimed elsewhere

- [ ] **Step 1: Write failing tests**

```typescript
import { ConflictException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { LinkedRepositoryRepository } from '../repositories/linked-repository.repository';
import { GithubConnectionRepository } from '../repositories/github-connection.repository';
import { GithubApiService } from '../services/github-api.service';
import { GithubOAuthService } from '../services/github-oauth.service';
import { RepositoryService } from '../services/repository.service';

describe('RepositoryService link uniqueness', () => {
    let service: RepositoryService;
    const linkedRepositories = {
        findByUserId: jest.fn(),
        findClaimedGithubRepoIds: jest.fn(),
        saveLinked: jest.fn(),
        deleteByIdAndUserId: jest.fn(),
    };
    const githubConnections = { findByUserId: jest.fn() };
    const githubApi = { listAccessibleRepos: jest.fn() };

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                RepositoryService,
                { provide: LinkedRepositoryRepository, useValue: linkedRepositories },
                { provide: GithubConnectionRepository, useValue: githubConnections },
                { provide: GithubApiService, useValue: githubApi },
                { provide: GithubOAuthService, useValue: {} },
                { provide: ModuleRef, useValue: { get: jest.fn(() => null) } },
            ],
        }).compile();
        service = module.get(RepositoryService);
        jest.clearAllMocks();
        githubConnections.findByUserId.mockResolvedValue({ accessToken: 'token' });
    });

    it('marks claimedByOtherAccount on listAvailableRepos', async () => {
        githubApi.listAccessibleRepos.mockResolvedValue([
            { githubId: 1, fullName: 'octo/a', name: 'a', owner: 'octo', defaultBranch: 'main', private: false, htmlUrl: 'https://github.com/octo/a' },
            { githubId: 2, fullName: 'octo/b', name: 'b', owner: 'octo', defaultBranch: 'main', private: false, htmlUrl: 'https://github.com/octo/b' },
        ]);
        linkedRepositories.findByUserId.mockResolvedValue([]);
        linkedRepositories.findClaimedGithubRepoIds.mockResolvedValue(new Set(['2']));
        const result = await service.listAvailableRepos('user-1');
        expect(result.repositories[0].claimedByOtherAccount).toBe(false);
        expect(result.repositories[1].claimedByOtherAccount).toBe(true);
    });

    it('throws ConflictException when linking a repo claimed elsewhere', async () => {
        githubApi.listAccessibleRepos.mockResolvedValue([
            { githubId: 2, fullName: 'octo/b', name: 'b', owner: 'octo', defaultBranch: 'main', private: false, htmlUrl: 'https://github.com/octo/b' },
        ]);
        linkedRepositories.findClaimedGithubRepoIds.mockResolvedValue(new Set(['2']));
        await expect(service.linkRepositories('user-1', { githubIds: [2] })).rejects.toThrow(ConflictException);
        expect(linkedRepositories.saveLinked).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun nx test @shipshout/shipshout-api-svc --testPathPattern=repository.service.spec`
Expected: FAIL on `claimedByOtherAccount` / no guard

- [ ] **Step 3: Implement DTO + service changes**

```typescript
// github-repo.dto.ts
@ApiProperty({
    example: false,
    description: 'Whether another ShipShout account has already linked this repository',
})
claimedByOtherAccount!: boolean;
```

```typescript
// repository.service.ts — listAvailableRepos
const githubRepoIds = available.map((repo) => String(repo.githubId));
const claimedElsewhere = await this.linkedRepositories.findClaimedGithubRepoIds(githubRepoIds, userId);

return {
    repositories: available.map((repo) => {
        const id = String(repo.githubId);
        const linked = linkedIds.has(id);
        return {
            ...this.toGithubRepoDto(repo, linked),
            claimedByOtherAccount: !linked && claimedElsewhere.has(id),
        };
    }),
};
```

Update `toGithubRepoDto` default: `claimedByOtherAccount: false`.

```typescript
// repository.service.ts — linkRepositories (inside loop, before saveLinked)
const claimed = await this.linkedRepositories.findClaimedGithubRepoIds([String(repo.githubId)], userId);
if (claimed.has(String(repo.githubId)))
    throw new ConflictException(`Repository ${repo.fullName} is already linked to another ShipShout account.`);
```

Wrap `saveLinked` in try/catch for `QueryFailedError` code `23505` → same `ConflictException`.

Add imports: `ConflictException`, `QueryFailedError` from `typeorm`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun nx test @shipshout/shipshout-api-svc --testPathPattern=repository.service.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/shipshout-api-svc/src/app/repository/dto/github-repo.dto.ts \
  apps/shipshout-api-svc/src/app/repository/services/repository.service.ts \
  apps/shipshout-api-svc/src/app/repository/__tests__/repository.service.spec.ts
git commit -m "feat(repository): block linking repos claimed by other accounts."
```

---

### Task 5: Regenerate API client

**Files:**

- Modify: `libs/api-client/src/lib/client/**` (generated)

**Interfaces:**

- Consumes: running API OpenAPI at `http://localhost:8000/docs/openapi.json`
- Produces: `GithubRepoDto` with `claimedByOtherAccount` in `@shipshout/api-client`

- [ ] **Step 1: Start API locally**

Run: `bun nx serve @shipshout/shipshout-api-svc`

- [ ] **Step 2: Regenerate client**

Run: `bun run openapi:generate`
Expected: `GithubRepoDto` includes `claimedByOtherAccount: boolean`

- [ ] **Step 3: Commit**

```bash
git add libs/api-client/src/lib/client/
git commit -m "chore(api-client): regenerate OpenAPI client for claimed repo flag."
```

---

### Task 6: Dashboard UI — disabled claimed repos

**Files:**

- Modify: `apps/shipshout-client-dashboard/src/components/repositories/repositories-client.tsx`

**Interfaces:**

- Consumes: `GithubRepoDto.claimedByOtherAccount` from `@shipshout/api-client`
- Produces: add-table shows claimed repos disabled with badge; selection skips them

- [ ] **Step 1: Replace selectable-only filtering with add-table repos**

```typescript
const addTableRepos = useMemo(() => props.available.filter((repo) => !repo.linked), [props.available]);
const isSelectable = (repo: GithubRepoDto) => !repo.claimedByOtherAccount;
const selectable = useMemo(() => addTableRepos.filter(isSelectable), [addTableRepos]);
const owners = useMemo(
    () => [...new Set(addTableRepos.map((repo) => repo.owner))].sort((a, b) => a.localeCompare(b)),
    [addTableRepos],
);

const filtered = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return addTableRepos.filter((repo) => {
        // same owner/visibility/search filters as today
    });
}, [addTableRepos, deferredSearch, ownerFilter, visibilityFilter]);
```

Replace `selectable.length` guards for empty table with `addTableRepos.length` where the table should still render claimed rows.

- [ ] **Step 2: Disable row/checkbox for claimed repos**

```typescript
const canSelect = isSelectable(repo);
// Table.Row: opacity={canSelect ? 1 : 0.6}, cursor={canSelect ? 'pointer' : 'default'}
// onClick only when canSelect
// Checkbox.Root disabled={!canSelect}
```

Add column or badge in Repository cell:

```tsx
<Show when={repo.claimedByOtherAccount}>
    <Badge colorPalette="gray" variant="subtle" borderRadius="full">
        Linked to another account
    </Badge>
</Show>
```

Update `toggleAll` / `toggleRow` to no-op when `!isSelectable(repo)`.

- [ ] **Step 3: Build dashboard**

Run: `bun nx build @shipshout/shipshout-client-dashboard`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/shipshout-client-dashboard/src/components/repositories/repositories-client.tsx
git commit -m "feat(dashboard): disable repos already linked to another account."
```

---

### Task 7: Manual verification

- [ ] **Step 1: Account A links a repo successfully**

Sign in as account that owns the repo → link an unclaimed repo → appears under Linked.

- [ ] **Step 2: Account B sees repo disabled**

Sign in as second account → open Add repositories → repo shows **Linked to another account**, checkbox disabled.

- [ ] **Step 3: Account B gets 409 if forced**

Attempt link via API/devtools → toast **Could not link repositories** with conflict message.

- [ ] **Step 4: Confirm DB constraint**

Run: `psql` duplicate count query → 0 rows; `\d linked_repositories` shows `uq_linked_repositories_github_repo`.

---

## Spec self-review (plan vs spec)

| Spec requirement | Task |
| --- | --- |
| Global unique index on `github_repo_id` | Task 3 |
| Dedupe earliest + webhook cleanup | Task 2 |
| `claimedByOtherAccount` on list API | Tasks 4–5 |
| `409 Conflict` on link guard | Task 4 |
| UI: show disabled + badge | Task 6 |
| Unit tests for API guard/list | Task 4 |
| Out of scope: webhook dedup fix | Not included |

No placeholders remain. Type names consistent across tasks.
