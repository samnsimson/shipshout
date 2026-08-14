# NestJS API Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize `apps/api`, `apps/worker`, and all `libs/` into NestJS-conventional role-based subfolders, relocate specs to `__tests__/`, then replace Zod contracts with class-validator DTOs.

**Architecture:** Two-phase rollout. Phase 1 is pure file moves + import fixes (zero behavior change), executed bottom-up along the dependency graph. Phase 2 adds class-validator DTOs, global ValidationPipe, and deletes `@shipshout/contracts`. Each lib keeps its public barrel export at `src/index.ts`; only internal paths change.

**Tech Stack:** NestJS 11, Nx 23, TypeORM, Jest/SWC, class-validator, class-transformer

**Spec:** `docs/superpowers/specs/2026-08-06-nestjs-api-reorganization-design.md`

## Global Constraints

- Scope: `apps/api`, `apps/worker`, all `libs/` — **not** `apps/web`
- Only create subfolders that contain files (no empty placeholders in Phase 1)
- `*.module.ts` stays at module root
- Spec files live under `__tests__/` mirroring source paths (e.g. `services/foo.service.ts` → `__tests__/services/foo.service.spec.ts`)
- Phase 1 must not change runtime behavior — import path updates only
- DTOs use class-validator + class-transformer (Phase 2 only)
- Delete `libs/shared/contracts` in Phase 2
- Use `git mv` for all renames to preserve history
- Match existing code style (single-line `if` bodies without braces when one statement)

---

## File Structure Overview

### Phase 1 — Moves only

| Area | Module root | New subfolders |
|------|-------------|----------------|
| `libs/shared/util` | `src/lib/` | `utils/`, `__tests__/utils/` |
| `libs/core/domain` | `src/lib/` | `utils/`, `__tests__/utils/` |
| `libs/data/database` | `src/lib/` | `config/`, `repositories/`, `entities/` (existing), `migrations/` (existing), `testing/`, `__tests__/` |
| `libs/shared/observability` | `src/lib/` | `services/`, `utils/`, `__tests__/` |
| `libs/shared/contracts` | `src/lib/` | `contracts/`, `__tests__/contracts/` (deleted Phase 2) |
| `libs/auth` | `src/lib/` | `services/`, `guards/`, `strategies/`, `repositories/`, `__tests__/` |
| `libs/billing` | `src/lib/` | `services/`, `utils/`, `__tests__/` |
| `libs/ai` | `src/lib/` | `services/`, `providers/`, `repositories/`, `utils/`, `__tests__/` |
| `libs/queue` | `src/lib/` | `constants/`, `utils/`, `__tests__/` |
| `libs/integrations/*` | `src/lib/` | `connectors/` or `utils/`, `__tests__/` |
| `apps/worker` | `src/app/` | `controllers/`, `services/`, `processors/`, `repositories/`, `factories/`, `connectors/`, `config/`, `__tests__/` |
| `apps/api` | `src/app/<module>/` | per-module `controllers/`, `services/`, `repositories/`, `middleware/`, `utils/`, `config/`, `__tests__/` |

### Phase 2 — New DTO files (API only)

| Module | New file |
|--------|----------|
| `workspaces` | `dtos/create-workspace.dto.ts` |
| `repositories` | `dtos/register-repo.dto.ts` |
| `drafts` | `dtos/update-draft.dto.ts` |
| `brand` | `dtos/update-brand.dto.ts` |
| `public` | `dtos/public-tweet.dto.ts` |
| `webhooks` | `dtos/simulate-release.dto.ts` |

---

## Phase 1 — Structure Only

### Task 1: Shared test-config verification

Before moving files, confirm Jest picks up specs under `__tests__/`.

**Files:**
- Create: `libs/shared/util/src/lib/__tests__/utils/smoke.spec.ts`
- Delete: `libs/shared/util/src/lib/__tests__/utils/smoke.spec.ts` (after verification)

- [ ] **Step 1: Create temporary smoke spec**

```typescript
// libs/shared/util/src/lib/__tests__/utils/smoke.spec.ts
describe('smoke', () => {
    it('jest finds __tests__ specs', () => {
        expect(true).toBe(true);
    });
});
```

- [ ] **Step 2: Run util tests**

Run: `cd shipshout && nx test util`
Expected: PASS including smoke spec

- [ ] **Step 3: Delete smoke spec**

Run: `rm libs/shared/util/src/lib/__tests__/utils/smoke.spec.ts`

If Step 2 fails, add to every backend `jest.config.cts`:

```javascript
testMatch: ['**/__tests__/**/*.spec.ts', '**/__tests__/**/*.test.ts'],
```

Then re-run Step 2 before continuing.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(test): verify jest discovers __tests__ spec paths"
# only if jest.config changes were needed; otherwise skip empty commit
```

---

### Task 2: Reorganize `libs/shared/util`

**Files:**
- Move: `libs/shared/util/src/lib/crypto.ts` → `libs/shared/util/src/lib/utils/crypto.ts`
- Move: `libs/shared/util/src/lib/rate-limiter.ts` → `libs/shared/util/src/lib/utils/rate-limiter.ts`
- Move: specs → `libs/shared/util/src/lib/__tests__/utils/`
- Modify: `libs/shared/util/src/index.ts`

**Interfaces:**
- Produces: `@shipshout/util` exports unchanged (`crypto`, `rate-limiter` symbols)

- [ ] **Step 1: Move source and spec files**

```bash
cd shipshout
mkdir -p libs/shared/util/src/lib/utils libs/shared/util/src/lib/__tests__/utils
git mv libs/shared/util/src/lib/crypto.ts libs/shared/util/src/lib/utils/crypto.ts
git mv libs/shared/util/src/lib/rate-limiter.ts libs/shared/util/src/lib/utils/rate-limiter.ts
git mv libs/shared/util/src/lib/crypto.spec.ts libs/shared/util/src/lib/__tests__/utils/crypto.spec.ts
git mv libs/shared/util/src/lib/rate-limiter.spec.ts libs/shared/util/src/lib/__tests__/utils/rate-limiter.spec.ts
```

- [ ] **Step 2: Update barrel export**

```typescript
// libs/shared/util/src/index.ts
export * from './lib/utils/crypto';
export * from './lib/utils/rate-limiter';
```

- [ ] **Step 3: Fix spec imports**

In `__tests__/utils/crypto.spec.ts`:
```typescript
import { ... } from '../../utils/crypto';
```

In `__tests__/utils/rate-limiter.spec.ts`:
```typescript
import { ... } from '../../utils/rate-limiter';
```

- [ ] **Step 4: Run tests**

Run: `nx test util`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add libs/shared/util
git commit -m "refactor(util): organize into utils/ and __tests__/"
```

---

### Task 3: Reorganize `libs/core/domain`

**Files:**
- Move: `build-prompt.ts`, `channel-constraints.ts` → `utils/`
- Move: `build-prompt.spec.ts` → `__tests__/utils/build-prompt.spec.ts`
- Modify: `libs/core/domain/src/index.ts`

- [ ] **Step 1: Move files**

```bash
mkdir -p libs/core/domain/src/lib/utils libs/core/domain/src/lib/__tests__/utils
git mv libs/core/domain/src/lib/build-prompt.ts libs/core/domain/src/lib/utils/build-prompt.ts
git mv libs/core/domain/src/lib/channel-constraints.ts libs/core/domain/src/lib/utils/channel-constraints.ts
git mv libs/core/domain/src/lib/build-prompt.spec.ts libs/core/domain/src/lib/__tests__/utils/build-prompt.spec.ts
```

- [ ] **Step 2: Update barrel**

```typescript
// libs/core/domain/src/index.ts
export * from './lib/utils/build-prompt';
export * from './lib/utils/channel-constraints';
```

- [ ] **Step 3: Fix internal imports**

In `utils/build-prompt.ts`, update any relative imports to sibling utils.
In `__tests__/utils/build-prompt.spec.ts`:
```typescript
import { ... } from '../../utils/build-prompt';
```

- [ ] **Step 4: Run tests**

Run: `nx test core-domain`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add libs/core/domain
git commit -m "refactor(domain): organize into utils/ and __tests__/"
```

---

### Task 4: Reorganize `libs/data/database`

**Files:**
- Move: `data-source.ts`, `typeorm.config.ts`, `migration-classes.ts` → `config/`
- Move: `base-repository.ts` → `repositories/`
- Move: entity specs → `__tests__/entities/`
- Move: other specs → mirrored `__tests__/` paths
- Modify: `libs/data/database/src/index.ts`, any internal imports

**Interfaces:**
- Produces: `@shipshout/database` exports unchanged

- [ ] **Step 1: Create folders and move config/repository files**

```bash
mkdir -p libs/data/database/src/lib/config
mkdir -p libs/data/database/src/lib/repositories
mkdir -p libs/data/database/src/lib/__tests__/config
mkdir -p libs/data/database/src/lib/__tests__/repositories
mkdir -p libs/data/database/src/lib/__tests__/entities
mkdir -p libs/data/database/src/lib/__tests__/testing

git mv libs/data/database/src/lib/data-source.ts libs/data/database/src/lib/config/data-source.ts
git mv libs/data/database/src/lib/typeorm.config.ts libs/data/database/src/lib/config/typeorm.config.ts
git mv libs/data/database/src/lib/migration-classes.ts libs/data/database/src/lib/config/migration-classes.ts
git mv libs/data/database/src/lib/base-repository.ts libs/data/database/src/lib/repositories/base-repository.ts
```

- [ ] **Step 2: Move spec files**

```bash
git mv libs/data/database/src/lib/data-source.spec.ts libs/data/database/src/lib/__tests__/config/data-source.spec.ts
git mv libs/data/database/src/lib/base-repository.spec.ts libs/data/database/src/lib/__tests__/repositories/base-repository.spec.ts
git mv libs/data/database/src/lib/testing/test-datasource.spec.ts libs/data/database/src/lib/__tests__/testing/test-datasource.spec.ts
git mv libs/data/database/src/lib/entities/*.spec.ts libs/data/database/src/lib/__tests__/entities/
# entities/ stays in place for *.entity.ts files
# migrations/ stays in place
# testing/test-datasource.ts stays in testing/
```

- [ ] **Step 3: Update barrel export**

```typescript
// libs/data/database/src/index.ts
export * from './lib/config/data-source';
export * from './lib/config/typeorm.config';
export * from './lib/repositories/base-repository';
export * from './lib/entities/user.entity';
// ... all other entity exports (update paths from ./lib/entities/ — unchanged)
```

- [ ] **Step 4: Fix all relative imports within database lib**

Key files to update:
- `config/data-source.ts` — imports to entities, migrations, config siblings
- `repositories/base-repository.ts` — unchanged entity imports (`../entities/...`)
- `__tests__/**/*.spec.ts` — fix paths to source files
- Root `package.json` migration scripts reference `libs/data/database/dist/lib/data-source.js` — update to `dist/lib/config/data-source.js` if output path changes (check `tsconfig.lib.json` — rootDir is `src`, so output becomes `dist/lib/config/data-source.js`)

- [ ] **Step 5: Update migration script paths**

Modify `shipshout/package.json`:
```json
"migration:run": "nx build database && dotenv -e .env -- typeorm migration:run -d libs/data/database/dist/lib/config/data-source.js",
"migration:gen": "nx build database && dotenv -e .env -- typeorm migration:generate -d libs/data/database/dist/lib/config/data-source.js",
```

- [ ] **Step 6: Run tests and build**

Run: `nx test database && nx build database`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add libs/data/database package.json
git commit -m "refactor(database): organize into config/, repositories/, __tests__/"
```

---

### Task 5: Reorganize `libs/shared/observability`

**Files:**
- Move: `pino-logger.service.ts` → `services/`
- Move: `logger.ts` → `utils/`
- Move: specs → `__tests__/services/`, `__tests__/utils/`
- Modify: `libs/shared/observability/src/index.ts`

- [ ] **Step 1: Move files**

```bash
mkdir -p libs/shared/observability/src/lib/services libs/shared/observability/src/lib/utils
mkdir -p libs/shared/observability/src/lib/__tests__/services libs/shared/observability/src/lib/__tests__/utils
git mv libs/shared/observability/src/lib/pino-logger.service.ts libs/shared/observability/src/lib/services/pino-logger.service.ts
git mv libs/shared/observability/src/lib/logger.ts libs/shared/observability/src/lib/utils/logger.ts
git mv libs/shared/observability/src/lib/pino-logger.service.spec.ts libs/shared/observability/src/lib/__tests__/services/pino-logger.service.spec.ts
git mv libs/shared/observability/src/lib/logger.spec.ts libs/shared/observability/src/lib/__tests__/utils/logger.spec.ts
```

- [ ] **Step 2: Update barrel and imports**

```typescript
// libs/shared/observability/src/index.ts
export * from './lib/services/pino-logger.service';
export * from './lib/utils/logger';
```

Fix `services/pino-logger.service.ts` if it imports from `./logger` → `../utils/logger`.

- [ ] **Step 3: Run tests**

Run: `nx test observability`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add libs/shared/observability
git commit -m "refactor(observability): organize into services/, utils/, __tests__/"
```

---

### Task 6: Reorganize `libs/shared/contracts` (structure only — deleted Phase 2)

**Files:**
- Move: `*.contracts.ts` → `contracts/`
- Move: specs → `__tests__/contracts/`
- Modify: `libs/shared/contracts/src/index.ts`

- [ ] **Step 1: Move files**

```bash
mkdir -p libs/shared/contracts/src/lib/contracts libs/shared/contracts/src/lib/__tests__/contracts
git mv libs/shared/contracts/src/lib/*.contracts.ts libs/shared/contracts/src/lib/contracts/
git mv libs/shared/contracts/src/lib/*.spec.ts libs/shared/contracts/src/lib/__tests__/contracts/
```

- [ ] **Step 2: Update barrel**

```typescript
export * from './lib/contracts/auth.contracts';
export * from './lib/contracts/workspace.contracts';
export * from './lib/contracts/repository.contracts';
export * from './lib/contracts/draft.contracts';
export * from './lib/contracts/brand.contracts';
export * from './lib/contracts/public.contracts';
```

- [ ] **Step 3: Fix spec imports**

```typescript
import { ... } from '../../contracts/repository.contracts';
```

- [ ] **Step 4: Run tests**

Run: `nx test contracts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add libs/shared/contracts
git commit -m "refactor(contracts): organize into contracts/ and __tests__/"
```

---

### Task 7: Reorganize `libs/auth`

**Files:**
- Move: `auth.service.ts` → `services/`
- Move: `workspace.guard.ts` → `guards/`
- Move: `github.strategy.ts` → `strategies/`
- Move: `repositories/*` stays in `repositories/`
- Move: specs → mirrored `__tests__/`
- Modify: `libs/auth/src/index.ts`

- [ ] **Step 1: Move files**

```bash
mkdir -p libs/auth/src/lib/services libs/auth/src/lib/guards libs/auth/src/lib/strategies
mkdir -p libs/auth/src/lib/__tests__/services libs/auth/src/lib/__tests__/guards
git mv libs/auth/src/lib/auth.service.ts libs/auth/src/lib/services/auth.service.ts
git mv libs/auth/src/lib/workspace.guard.ts libs/auth/src/lib/guards/workspace.guard.ts
git mv libs/auth/src/lib/github.strategy.ts libs/auth/src/lib/strategies/github.strategy.ts
git mv libs/auth/src/lib/auth.service.spec.ts libs/auth/src/lib/__tests__/services/auth.service.spec.ts
git mv libs/auth/src/lib/workspace.guard.spec.ts libs/auth/src/lib/__tests__/guards/workspace.guard.spec.ts
# repositories/ already exists — leave in place
```

- [ ] **Step 2: Update barrel**

```typescript
export * from './lib/services/auth.service';
export * from './lib/strategies/github.strategy';
export * from './lib/guards/workspace.guard';
export * from './lib/repositories/user.repository';
export * from './lib/repositories/workspace.repository';
export * from './lib/repositories/membership.repository';
```

- [ ] **Step 3: Fix cross-file imports within auth lib**

`guards/workspace.guard.ts` — update repository imports to `../repositories/...`
`strategies/github.strategy.ts` — update service/repository imports
`__tests__/**/*.spec.ts` — fix relative paths

- [ ] **Step 4: Run tests**

Run: `nx test auth`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add libs/auth
git commit -m "refactor(auth): organize into services/, guards/, strategies/, __tests__/"
```

---

### Task 8: Reorganize `libs/billing`

- [ ] **Step 1: Move files**

```bash
mkdir -p libs/billing/src/lib/services libs/billing/src/lib/utils
mkdir -p libs/billing/src/lib/__tests__/services libs/billing/src/lib/__tests__/utils
git mv libs/billing/src/lib/billing.service.ts libs/billing/src/lib/services/billing.service.ts
git mv libs/billing/src/lib/subscription-sync.service.ts libs/billing/src/lib/services/subscription-sync.service.ts
git mv libs/billing/src/lib/plan-limits.ts libs/billing/src/lib/utils/plan-limits.ts
git mv libs/billing/src/lib/billing.service.spec.ts libs/billing/src/lib/__tests__/services/billing.service.spec.ts
git mv libs/billing/src/lib/subscription-sync.service.spec.ts libs/billing/src/lib/__tests__/services/subscription-sync.service.spec.ts
git mv libs/billing/src/lib/plan-limits.spec.ts libs/billing/src/lib/__tests__/utils/plan-limits.spec.ts
```

- [ ] **Step 2: Update barrel**

```typescript
export * from './lib/services/billing.service';
export * from './lib/services/subscription-sync.service';
export * from './lib/utils/plan-limits';
```

- [ ] **Step 3: Fix internal imports and run tests**

Run: `nx test billing`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add libs/billing
git commit -m "refactor(billing): organize into services/, utils/, __tests__/"
```

---

### Task 9: Reorganize `libs/ai`

- [ ] **Step 1: Move files**

```bash
mkdir -p libs/ai/src/lib/services libs/ai/src/lib/providers libs/ai/src/lib/utils
mkdir -p libs/ai/src/lib/__tests__/services
git mv libs/ai/src/lib/generation.service.ts libs/ai/src/lib/services/generation.service.ts
git mv libs/ai/src/lib/openai.provider.ts libs/ai/src/lib/providers/openai.provider.ts
git mv libs/ai/src/lib/claude.provider.ts libs/ai/src/lib/providers/claude.provider.ts
git mv libs/ai/src/lib/ai-engine.ts libs/ai/src/lib/utils/ai-engine.ts
git mv libs/ai/src/lib/ai-provider.ts libs/ai/src/lib/utils/ai-provider.ts
# repositories/generation.repositories.ts stays in repositories/
git mv libs/ai/src/lib/generation.service.spec.ts libs/ai/src/lib/__tests__/services/generation.service.spec.ts
git mv libs/ai/src/lib/ai-engine.spec.ts libs/ai/src/lib/__tests__/utils/ai-engine.spec.ts
```

- [ ] **Step 2: Update barrel and internal imports**

```typescript
export * from './lib/services/generation.service';
export * from './lib/providers/openai.provider';
export * from './lib/providers/claude.provider';
export * from './lib/utils/ai-engine';
export * from './lib/utils/ai-provider';
export * from './lib/repositories/generation.repositories';
```

- [ ] **Step 3: Run tests**

Run: `nx test ai`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add libs/ai
git commit -m "refactor(ai): organize into services/, providers/, utils/, __tests__/"
```

---

### Task 10: Reorganize `libs/queue`

- [ ] **Step 1: Move files**

```bash
mkdir -p libs/queue/src/lib/constants libs/queue/src/lib/utils libs/queue/src/lib/__tests__/utils
git mv libs/queue/src/lib/queue.constants.ts libs/queue/src/lib/constants/queue.constants.ts
git mv libs/queue/src/lib/jobs.ts libs/queue/src/lib/utils/jobs.ts
git mv libs/queue/src/lib/jobs.spec.ts libs/queue/src/lib/__tests__/utils/jobs.spec.ts
# queue.module.ts stays at src/lib/queue.module.ts
```

- [ ] **Step 2: Update barrel, `queue.module.ts` imports, run tests**

Run: `nx test queue`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add libs/queue
git commit -m "refactor(queue): organize into constants/, utils/, __tests__/"
```

---

### Task 11: Reorganize `libs/integrations/*`

Repeat the same pattern for each integration package:

| Package | Source files → folder |
|---------|----------------------|
| `github` | `github-api.ts`, `normalize-release.ts`, `verify-signature.ts` → `utils/` |
| `jira` | `normalize.ts`, `verify.ts` → `utils/` |
| `linear` | `normalize.ts`, `verify-signature.ts` → `utils/` |
| `x`, `linkedin`, `email`, `buffer`, `mailchimp` | `*.connector.ts` → `connectors/` |
| `core` | `dispatch.service.ts` → `services/`; `connector-registry.ts`, `channel-connector.ts` → `utils/`; `repositories/` stays |

- [ ] **Step 1: Move files and specs for all integration packages**

Run moves for each package following Task 2 pattern (utils or connectors subfolder + `__tests__/` mirror).

- [ ] **Step 2: Update each package's `src/index.ts` barrel exports**

- [ ] **Step 3: Run all integration tests**

Run: `nx run-many -t test --projects=integrations-github,integrations-jira,integrations-linear,integrations-x,integrations-linkedin,integrations-email,integrations-buffer,integrations-mailchimp,integrations-core`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add libs/integrations
git commit -m "refactor(integrations): organize into connectors/, utils/, services/, __tests__/"
```

---

### Task 12: Reorganize `apps/worker`

**Files:** Move all flat `src/app/*.ts` into role subfolders.

- [ ] **Step 1: Move files**

```bash
cd shipshout/apps/worker/src/app
mkdir -p controllers services processors repositories factories connectors config __tests__/controllers __tests__/services __tests__/processors __tests__/factories __tests__/connectors

git mv app.controller.ts controllers/
git mv app.service.ts services/
git mv worker-connections.service.ts services/
git mv dispatch.processor.ts processors/
git mv generate.processor.ts processors/
git mv channel-connection.repository.ts repositories/
git mv connector-registry.factory.ts factories/
git mv mock-connector.ts connectors/
# config/database.module.ts and config/typeorm.module.ts already in config/

git mv app.controller.spec.ts __tests__/controllers/
git mv app.service.spec.ts __tests__/services/
git mv dispatch.processor.spec.ts __tests__/processors/
git mv generate.processor.spec.ts __tests__/processors/
git mv connector-registry.factory.spec.ts __tests__/factories/
git mv mock-connector.spec.ts __tests__/connectors/
```

- [ ] **Step 2: Update `app.module.ts` imports**

```typescript
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.service';
import { WorkerConnectionsService } from './services/worker-connections.service';
import { DispatchProcessor } from './processors/dispatch.processor';
import { GenerateProcessor } from './processors/generate.processor';
import { ChannelConnectionRepository } from './repositories/channel-connection.repository';
import { connectorRegistryFactory } from './factories/connector-registry.factory';
import { DatabaseModule } from './config/database.module';
```

- [ ] **Step 3: Fix all internal relative imports and spec imports**

- [ ] **Step 4: Run tests and build**

Run: `nx test worker && nx build worker`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/worker
git commit -m "refactor(worker): organize into role-based subfolders and __tests__/"
```

---

### Task 13: Reorganize `apps/api` — config and root app

- [ ] **Step 1: Move root app files**

```bash
cd shipshout/apps/api/src/app
mkdir -p controllers services __tests__/controllers __tests__/services
git mv app.controller.ts controllers/
git mv app.service.ts services/
git mv app.controller.spec.ts __tests__/controllers/
git mv app.service.spec.ts __tests__/services/
```

- [ ] **Step 2: Update `app.module.ts`**

```typescript
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.service';
import { SessionUserMiddleware } from './auth/middleware/session-user.middleware';
```

- [ ] **Step 3: Verify config module** — `config/database.module.ts` and `config/typeorm.module.ts` already in `config/`; move `config/typeorm.module.spec.ts` → `config/__tests__/typeorm.module.spec.ts`

- [ ] **Step 4: Run partial test**

Run: `nx test api --testPathPattern=app.controller`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app/app.module.ts apps/api/src/app/controllers apps/api/src/app/services apps/api/src/app/__tests__ apps/api/src/app/config
git commit -m "refactor(api): reorganize root app and config __tests__"
```

---

### Task 14: Reorganize `apps/api` — feature modules

Apply this pattern to **each** module (`auth`, `billing`, `brand`, `connections`, `drafts`, `health`, `public`, `repositories`, `webhooks`, `workspaces`):

1. Create `controllers/`, `services/`, `repositories/`, `middleware/`, `utils/` as needed
2. `git mv` files into role folders
3. `git mv` specs into `__tests__/<role>/`
4. Update `<module>.module.ts` imports
5. Fix cross-file relative imports within module

**Module-specific moves:**

| Module | Moves |
|--------|-------|
| `auth` | `auth.controller.ts` → `controllers/`; `session-user.middleware.ts` → `middleware/` |
| `billing` | `billing.controller.ts` → `controllers/`; `tier.service.ts` → `services/`; `billing.repositories.ts` → `repositories/billing.repositories.ts` |
| `brand` | controller → `controllers/`; service → `services/`; `brand-profile.repository.ts` → `repositories/` |
| `connections` | controller → `controllers/`; service → `services/`; `channel-connection.repository.ts` → `repositories/`; `oauth.config.ts` → `utils/` |
| `drafts` | controller → `controllers/`; service → `services/`; `draft.repository.ts` → `repositories/` |
| `health` | controller → `controllers/` |
| `public` | controller → `controllers/`; `public-generate.service.ts` → `services/` |
| `repositories` | 3 controllers → `controllers/`; 2 services → `services/`; `connected-repo.repository.ts` → `repositories/` |
| `webhooks` | 2 controllers → `controllers/`; service → `services/`; `release-event.repository.ts` → `repositories/` |
| `workspaces` | controller → `controllers/`; service → `services/`; `repositories/workspace.repository.ts` → `repositories/` (merge flat) |

- [ ] **Step 1: Move all feature module files** (one module at a time, or all at once)

- [ ] **Step 2: Update each `*.module.ts`**

Example `repositories.module.ts`:
```typescript
import { RepositoriesController } from './controllers/repositories.controller';
import { GithubReposController, GithubInstallController } from './controllers/github-repos.controller';
import { GithubOAuthCallbackController } from './controllers/github-oauth-callback.controller';
import { RepositoriesService } from './services/repositories.service';
import { GithubReposService } from './services/github-repos.service';
import { ConnectedRepoRepository } from './repositories/connected-repo.repository';
```

- [ ] **Step 3: Fix cross-module imports**

Files importing from sibling modules use `../billing/services/tier.service` etc. Search:
```bash
rg "from '\\./" apps/api/src/app --glob '*.ts' | rg -v module.ts
```

- [ ] **Step 4: Run full API test suite and build**

Run: `nx test api && nx build api`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "refactor(api): organize feature modules into role-based subfolders"
```

---

### Task 15: Phase 1 verification gate

- [ ] **Step 1: Run all backend tests**

Run: `nx run-many -t test --projects=api,worker,auth,billing,ai,database,queue,util,core-domain,observability,contracts,integrations-github,integrations-core,integrations-x,integrations-linkedin,integrations-email,integrations-buffer,integrations-mailchimp,integrations-linear,integrations-jira`
Expected: All PASS

- [ ] **Step 2: Build apps**

Run: `nx build api && nx build worker`
Expected: PASS

- [ ] **Step 3: Confirm no stale flat spec files remain**

Run: `find apps/api apps/worker libs -name '*.spec.ts' ! -path '*/__tests__/*' ! -path '*/node_modules/*'`
Expected: No output

- [ ] **Step 4: Commit any fixups**

```bash
git commit -m "chore: phase 1 reorganization complete"
```

---

## Phase 2 — DTOs & Validation

### Task 16: Add validation dependencies and global pipe

**Files:**
- Modify: `shipshout/package.json`
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Install dependencies**

Run: `cd shipshout && bun add class-validator class-transformer`

- [ ] **Step 2: Register ValidationPipe**

```typescript
// apps/api/src/main.ts — add after NestFactory.create
import { ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
```

- [ ] **Step 3: Build API**

Run: `nx build api`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock apps/api/src/main.ts
git commit -m "feat(api): add global ValidationPipe with class-validator"
```

---

### Task 17: Create workspace and repository DTOs

**Files:**
- Create: `apps/api/src/app/workspaces/dtos/create-workspace.dto.ts`
- Create: `apps/api/src/app/repositories/dtos/register-repo.dto.ts`
- Modify: `apps/api/src/app/workspaces/controllers/workspaces.controller.ts`
- Modify: `apps/api/src/app/workspaces/services/workspaces.service.ts`
- Modify: `apps/api/src/app/repositories/controllers/repositories.controller.ts`
- Modify: `apps/api/src/app/repositories/services/repositories.service.ts`
- Test: `apps/api/src/app/workspaces/__tests__/`, `apps/api/src/app/repositories/__tests__/`

**Interfaces:**
- Produces: `CreateWorkspaceDto`, `RegisterRepoDto` classes

- [ ] **Step 1: Create DTOs**

```typescript
// apps/api/src/app/workspaces/dtos/create-workspace.dto.ts
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateWorkspaceDto {
    @IsString()
    @MinLength(1)
    @MaxLength(80)
    name!: string;
}
```

```typescript
// apps/api/src/app/repositories/dtos/register-repo.dto.ts
import { IsEnum, IsString, MinLength } from 'class-validator';

export class RegisterRepoDto {
    @IsEnum(['github', 'linear', 'jira'])
    provider!: 'github' | 'linear' | 'jira';

    @IsString()
    @MinLength(1)
    externalId!: string;

    @IsString()
    @MinLength(1)
    name!: string;
}
```

- [ ] **Step 2: Update workspaces controller**

```typescript
import { CreateWorkspaceDto } from '../dtos/create-workspace.dto';

@Post()
create(@Body() dto: CreateWorkspaceDto) {
    return this.svc.create(dto);
}
```

Remove `CreateWorkspaceSchema.safeParse` block and `@shipshout/contracts` import.

- [ ] **Step 3: Update workspaces service**

```typescript
import { CreateWorkspaceDto } from '../dtos/create-workspace.dto';
// replace import from @shipshout/contracts
```

- [ ] **Step 4: Update repositories controller and service** (same pattern with `RegisterRepoDto`)

- [ ] **Step 5: Run tests**

Run: `nx test api --testPathPattern='workspaces|repositories'`
Expected: PASS (update tests if they send invalid payloads expecting old error format)

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/app/workspaces apps/api/src/app/repositories
git commit -m "feat(api): replace workspace and repository Zod schemas with DTOs"
```

---

### Task 18: Create draft, brand, and public DTOs

**Files:**
- Create: `apps/api/src/app/drafts/dtos/update-draft.dto.ts`
- Create: `apps/api/src/app/brand/dtos/update-brand.dto.ts`
- Create: `apps/api/src/app/public/dtos/public-tweet.dto.ts`
- Modify: corresponding controllers and services

- [ ] **Step 1: Create DTOs**

```typescript
// apps/api/src/app/drafts/dtos/update-draft.dto.ts
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateDraftDto {
    @IsString()
    @MinLength(1)
    @MaxLength(5000)
    editedCopy!: string;
}
```

```typescript
// apps/api/src/app/brand/dtos/update-brand.dto.ts
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBrandDto {
    @IsEnum(['dev_focused', 'professional', 'hype_startup'])
    tone!: 'dev_focused' | 'professional' | 'hype_startup';

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    customInstructions?: string;

    @IsBoolean()
    emojiPolicy!: boolean;
}
```

```typescript
// apps/api/src/app/public/dtos/public-tweet.dto.ts
import { IsString, MaxLength, MinLength } from 'class-validator';

export class PublicTweetDto {
    @IsString()
    @MinLength(1)
    @MaxLength(4000)
    releaseNotes!: string;
}
```

- [ ] **Step 2: Update controllers — remove safeParse, use @Body() dto**

- [ ] **Step 3: Update services — import DTOs locally**

- [ ] **Step 4: Run tests**

Run: `nx test api --testPathPattern='drafts|brand|public'`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app/drafts apps/api/src/app/brand apps/api/src/app/public
git commit -m "feat(api): replace draft, brand, and public Zod schemas with DTOs"
```

---

### Task 19: Create webhook simulate DTO and delete contracts

**Files:**
- Create: `apps/api/src/app/webhooks/dtos/simulate-release.dto.ts`
- Modify: `apps/api/src/app/webhooks/controllers/repository-simulate.controller.ts`
- Delete: `libs/shared/contracts/` (entire project)
- Modify: `tsconfig.json`, `apps/api/tsconfig.app.json`, `nx.json` (if project registered)

- [ ] **Step 1: Create DTO**

```typescript
// apps/api/src/app/webhooks/dtos/simulate-release.dto.ts
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SimulateReleaseDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(200)
    title?: string;

    @IsOptional()
    @IsString()
    @MaxLength(5000)
    notes?: string;
}
```

- [ ] **Step 2: Update repository-simulate controller**

```typescript
import { SimulateReleaseDto } from '../dtos/simulate-release.dto';

@Post()
simulate(@Param('workspaceId') ws: string, @Param('repoId') repoId: string, @Body() dto: SimulateReleaseDto) {
    // use dto directly
}
```

- [ ] **Step 3: Confirm no remaining contract imports**

Run: `rg '@shipshout/contracts' shipshout --glob '*.{ts,tsx,json}'`
Expected: Only tsconfig references (about to remove)

- [ ] **Step 4: Remove contracts project**

```bash
rm -rf libs/shared/contracts
```

Remove from `tsconfig.json` references:
```json
// delete block:
{ "path": "./libs/shared/contracts" }
```

Remove from `apps/api/tsconfig.app.json` references:
```json
// delete block:
{ "path": "../../libs/shared/contracts/tsconfig.lib.json" }
```

Remove `contracts` project from `nx.json` / `project.json` if present.

- [ ] **Step 5: Remove zod if unused**

Run: `rg "from 'zod'" shipshout --glob '*.ts'`
If no results: `bun remove zod`

- [ ] **Step 6: Run full test suite**

Run: `nx run-many -t test --all --exclude=web,api-e2e`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(api): complete DTO migration and remove contracts lib"
```

---

### Task 20: Phase 2 verification gate

- [ ] **Step 1: Verify no contract imports remain**

Run: `rg '@shipshout/contracts|shipshout/contracts' shipshout`
Expected: No matches

- [ ] **Step 2: Verify all API modules have dtos/ where needed**

Run: `ls apps/api/src/app/{workspaces,repositories,drafts,brand,public,webhooks}/dtos/`
Expected: DTO file in each

- [ ] **Step 3: Full build and test**

Run: `nx run-many -t test,build --projects=api,worker`
Expected: PASS

- [ ] **Step 4: Manual smoke test (optional)**

Run API dev server, POST invalid body to `/api/workspaces` — expect 400 with class-validator error array.

---

## Plan Self-Review

**Spec coverage:**
- ✅ Role-based subfolders — Tasks 2–14
- ✅ `__tests__/` mirroring — all tasks
- ✅ Phase 1 zero behavior change — Tasks 1–15
- ✅ class-validator DTOs — Tasks 16–19
- ✅ Delete contracts — Task 19
- ✅ Worker included — Task 12
- ✅ Dependency order — Tasks 2→11 (libs) → 12 (worker) → 13–14 (api)
- ✅ Global ValidationPipe — Task 16
- ✅ Migration script path update — Task 4

**No placeholders remaining.**

**Type consistency:** DTO field names match Zod schemas from contracts (`name`, `provider`, `externalId`, `editedCopy`, `tone`, `emojiPolicy`, `releaseNotes`, `title`, `notes`).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-06-nestjs-api-reorganization-implementation.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
