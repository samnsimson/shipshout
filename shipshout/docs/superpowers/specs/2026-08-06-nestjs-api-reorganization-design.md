# NestJS API & Backend Reorganization Design

**Date:** 2026-08-06  
**Status:** Approved  
**Scope:** `apps/api`, `apps/worker`, all `libs/`

## Summary

Reorganize the ShipShout backend to follow NestJS module conventions: role-based subfolders (`controllers/`, `services/`, `repositories/`, `dtos/`, etc.) within each module and lib. All spec files move to `__tests__/` with paths mirroring source layout. Execution is two-phase — structure first, then DTO migration.

## Goals

- Predictable, NestJS-conventional folder layout across API, worker, and libs
- class-validator + class-transformer DTOs replacing Zod contracts
- Deprecate and remove `@shipshout/contracts`
- Zero behavior change during Phase 1

## Non-Goals

- Web app changes (`apps/web` specs stay as-is)
- Route path or HTTP behavior changes
- Database schema or migration changes
- Converting libs into re-exported NestJS modules consumed differently by API

## Decisions

| Decision | Choice |
|----------|--------|
| Scope | `apps/api`, `apps/worker`, all `libs/` |
| Folder strategy | Strict canonical role-based subfolders (Approach A) |
| DTOs | class-validator + class-transformer in API module `dtos/` folders |
| Infra libs | Same folder convention as feature libs |
| Contracts | Delete `@shipshout/contracts` in Phase 2 |
| Rollout | Two-phase: moves → DTOs |
| Tests | All backend specs under `__tests__/`, mirroring source tree |
| Test scope | api + libs + worker (not web) |

## Target Folder Convention

Every module/lib uses role-based subfolders. The `*.module.ts` file stays at the module root. **Only create folders that contain files** — no empty placeholder directories.

| Folder | Contents |
|--------|----------|
| `controllers/` | `@Controller()` classes |
| `services/` | `@Injectable()` business logic |
| `repositories/` | Data access (TypeORM repos, custom repositories) |
| `dtos/` | class-validator DTO classes (Phase 2, API only) |
| `guards/` | `@Injectable()` guards |
| `decorators/` | Custom param/method decorators |
| `middleware/` | NestJS middleware |
| `strategies/` | Passport strategies |
| `processors/` | BullMQ job processors (worker) |
| `factories/` | Factory providers (worker) |
| `entities/` | TypeORM entities (database lib) |
| `migrations/` | TypeORM migrations (database lib) |
| `connectors/` | Channel/integration connectors |
| `providers/` | AI provider implementations |
| `config/` | Module wiring (TypeORM, database) |
| `utils/` | Pure helpers (normalize, verify, crypto, domain logic) |
| `constants/` | Enums, job names, queue constants |
| `testing/` | Test utilities (database test datasource) |
| `__tests__/` | All `*.spec.ts` files |

### Example — API module (`repositories`)

```
apps/api/src/app/repositories/
  repositories.module.ts
  controllers/
    repositories.controller.ts
    github-repos.controller.ts
    github-oauth-callback.controller.ts
  services/
    repositories.service.ts
    github-repos.service.ts
  repositories/
    connected-repo.repository.ts
  dtos/                              ← Phase 2
    register-repo.dto.ts
  __tests__/
    controllers/repositories.controller.spec.ts
    services/github-repos.service.spec.ts
    services/repositories.service.spec.ts
```

Integration specs live under the owning module, e.g. `webhooks/__tests__/webhooks.integration.spec.ts`.

### Example — Worker

```
apps/worker/src/app/
  app.module.ts
  controllers/
    app.controller.ts
  services/
    app.service.ts
    worker-connections.service.ts
  processors/
    dispatch.processor.ts
    generate.processor.ts
  repositories/
    channel-connection.repository.ts
  factories/
    connector-registry.factory.ts
  connectors/
    mock-connector.ts
  config/
    database.module.ts
    typeorm.module.ts
  __tests__/
    controllers/app.controller.spec.ts
    processors/dispatch.processor.spec.ts
    ...
```

## Lib-Specific Mappings

| Lib | Target layout |
|-----|---------------|
| `libs/auth` | `services/`, `guards/`, `strategies/`, `repositories/` |
| `libs/billing` | `services/`, `utils/` (plan-limits) |
| `libs/ai` | `services/`, `providers/`, `repositories/`, `utils/` (ai-engine, ai-provider) |
| `libs/data/database` | `entities/`, `repositories/` (base-repository), `migrations/`, `config/` (data-source, typeorm.config), `testing/` |
| `libs/queue` | `constants/`, root `queue.module.ts`, `utils/` (jobs) |
| `libs/shared/observability` | `services/` (pino-logger), `utils/` (logger) |
| `libs/shared/util` | `utils/` (crypto, rate-limiter) |
| `libs/core/domain` | `utils/` (build-prompt, channel-constraints) |
| `libs/integrations/github` | `utils/` (github-api, normalize-release, verify-signature) |
| `libs/integrations/jira` | `utils/` (normalize, verify) |
| `libs/integrations/linear` | `utils/` (normalize, verify-signature) |
| `libs/integrations/x`, `linkedin`, `email`, `buffer`, `mailchimp` | `connectors/` |
| `libs/integrations/core` | `services/`, `repositories/`, `utils/` (connector-registry, channel-connector) |
| `libs/shared/contracts` | **Deleted in Phase 2** |

Barrel exports (`index.ts`) remain at each lib root. Public import paths (`@shipshout/auth`, etc.) do not change.

## API Module Inventory

All 12 API feature areas plus root app files:

| Module | Controllers | Services | Repositories | Other |
|--------|-------------|----------|--------------|-------|
| `auth` | auth.controller | — | — | middleware/ (session-user) |
| `billing` | billing.controller | tier.service | billing.repositories → `repositories/` | — |
| `brand` | brand.controller | brand.service | brand-profile.repository | — |
| `connections` | connections.controller | connections.service | channel-connection.repository | utils/ (oauth.config) |
| `config` | — | — | — | config/ (database, typeorm modules) |
| `drafts` | drafts.controller | drafts.service | draft.repository | — |
| `health` | health.controller | — | — | — |
| `public` | public.controller | public-generate.service | — | — |
| `repositories` | 3 controllers | 2 services | connected-repo.repository | — |
| `webhooks` | 2 controllers | webhooks.service | release-event.repository | — |
| `workspaces` | workspaces.controller | workspaces.service | workspace.repository (+ membership) | — |
| `app` (root) | app.controller | app.service | — | — |

## Phase 1 — Structure Only

**Goal:** Move files, fix imports, relocate specs. Zero behavior change.

### Steps

1. Reorganize all libs per lib-specific mappings (leaf dependencies first)
2. Reorganize `apps/worker`
3. Reorganize all 12 API modules + root app files
4. Move all backend spec files (~45) into `__tests__/` with mirrored paths
5. Update all relative imports and barrel `index.ts` exports
6. Update Jest configs per project: `testMatch` → `**/__tests__/**/*.spec.ts`
7. Update tsconfig excludes: `**/__tests__/**` instead of `**/*.spec.ts`
8. Run full test suite — all tests must pass with no logic changes

### Dependency order

```
libs/shared/util, libs/core/domain
  → libs/data/database
  → libs/shared/observability, libs/shared/contracts
  → libs/auth, libs/billing, libs/ai, libs/queue
  → libs/integrations/*
  → apps/worker
  → apps/api
```

### Verification

- `nx run-many -t test --projects=api,worker,auth,billing,ai,database,...` passes
- `nx build api` and `nx build worker` succeed
- No diff in runtime behavior (grep confirms no logic edits beyond import paths)

## Phase 2 — DTOs & Validation

**Goal:** Replace Zod contracts with class-validator DTOs; remove contracts lib.

### Steps

1. Add `class-validator` and `class-transformer` to root `package.json` dependencies
2. Register global `ValidationPipe` in `apps/api/src/main.ts`:

```typescript
import { ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
```

3. Create DTO classes in each API module's `dtos/` folder
4. Replace inline `Schema.safeParse()` in controllers with typed `@Body() dto: SomeDto`
5. Update services to import DTO types from local `dtos/` instead of `@shipshout/contracts`
6. Delete `libs/shared/contracts` — remove from Nx workspace, tsconfig references, path mappings
7. Remove `zod` from root dependencies if unused elsewhere

### DTO inventory (from current contracts usage)

| Module | DTO class | Replaces |
|--------|-----------|----------|
| `workspaces` | `CreateWorkspaceDto` | `CreateWorkspaceSchema` / `CreateWorkspaceDto` |
| `repositories` | `RegisterRepoDto` | `RegisterRepoSchema` / `RegisterRepoDto` |
| `drafts` | `UpdateDraftDto` | `UpdateDraftSchema` / `UpdateDraftDto` |
| `brand` | `UpdateBrandDto` | `UpdateBrandSchema` / `UpdateBrandDto` |
| `public` | `PublicTweetDto` | `PublicTweetSchema` |
| `webhooks` | `SimulateReleaseDto` | `SimulateReleaseSchema` |

### DTO pattern

```typescript
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

Controllers use:

```typescript
@Post()
create(@Param('workspaceId') ws: string, @Body() dto: RegisterRepoDto) {
    return this.svc.create(ws, dto);
}
```

Remove manual `safeParse` + `BadRequestException` blocks — `ValidationPipe` handles rejection.

### Verification

- All API controller tests pass with DTO validation
- Invalid payloads return 400 with class-validator error format
- No imports of `@shipshout/contracts` remain in codebase
- `libs/shared/contracts` directory deleted

## Testing Conventions

### `__tests__/` mirror rule

Source file path maps to test path:

```
services/foo.service.ts  →  __tests__/services/foo.service.spec.ts
guards/workspace.guard.ts  →  __tests__/guards/workspace.guard.spec.ts
```

### Config changes

- **Jest:** Update each project's jest config `testMatch` or `testRegex` to `**/__tests__/**/*.spec.ts`
- **tsconfig (app/lib):** Exclude `**/__tests__/**` from compilation
- **Integration specs:** Stay under owning module's `__tests__/` (e.g. `webhooks/__tests__/webhooks.integration.spec.ts`)

### Out of scope

- `apps/web` spec files remain in current locations

## What Stays Unchanged

- Module boundaries and NestJS module wiring
- Public `@shipshout/*` import paths (barrel exports updated internally)
- Database schema, migrations, entity definitions
- Route paths and HTTP behavior
- Web app

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Large Phase 1 diff breaks imports | Dependency-order moves; run tests after each lib |
| Jest can't find relocated specs | Update jest configs before moving specs |
| ValidationPipe changes error response shape | Update controller tests in Phase 2 to match new 400 format |
| Missed import after move | Grep for old paths; full build + test before merge |
