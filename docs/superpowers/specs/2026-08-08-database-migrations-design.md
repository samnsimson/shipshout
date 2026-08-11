# Database Migrations Design

**Date:** 2026-08-08  
**Status:** Approved for planning  
**Library:** `@shipshout/database`  
**Package manager:** bun (`bun` / `bunx`)

## Goal

Add TypeORM migration support to `@shipshout/database`: Nest registers an explicit migration class registry at boot, while the TypeORM CLI uses a repo-root DataSource with path globs. Operators generate/run/revert migrations via bun scripts. Migrations do not auto-run on app boot.

## Decisions

| Topic                    | Choice                                                                    |
| ------------------------ | ------------------------------------------------------------------------- |
| Scope                    | Config wiring + CLI (no `migrationsRun` on boot)                          |
| Migration file location  | `libs/database/src/lib/migrations/`                                       |
| Nest discovery           | Explicit `MIGRATIONS` registry (mirrors `ENTITIES`)                       |
| CLI discovery            | Glob on the migrations folder via root `typeorm.config.ts`                |
| Credentials in Nest APIs | Library does not read `process.env`                                       |
| Credentials for CLI      | Root `typeorm.config.ts` reads env (e.g. `DATABASE_URL`); fail if missing |
| Package manager          | bun / bunx                                                                |
| Spec file location       | Under `__tests__` directories                                             |

## Architecture

```
App boot (Nest)
  DatabaseModule.forRootAsync({ useFactory → connection opts })
    → TypeORM: { ...connection, type: postgres, entities: ENTITIES,
                 migrations: MIGRATIONS, synchronize: false }
    → does NOT auto-run migrations

CLI (bun)
  env → typeorm.config.ts DataSource
    → entities: ENTITIES (from @shipshout/database)
    → migrations: glob libs/database/src/lib/migrations/*
  bunx typeorm … -d typeorm.config.ts

After generate
  new file in migrations/ → visible to CLI glob
  developer exports class into MIGRATIONS → visible to Nest
```

Split discovery is intentional: Nest/webpack stays reliable with an explicit class list; CLI `migration:generate` stays convenient with folder globs.

## Components

### `migrations/` (`libs/database/src/lib/migrations/`)

- Holds TypeORM migration class files.
- `migrations/index.ts` exports `MIGRATIONS: Function[] = []` (aligned with `ENTITIES`; empty in this pass).
- New migrations are added as files here and registered in `MIGRATIONS` for Nest.

### `DatabaseModule`

- `forRootAsync` continues to merge caller connection options with fixed `type: 'postgres'`, `entities: ENTITIES`, `synchronize: false`.
- Additionally merges `migrations: MIGRATIONS`.
- Does **not** set `migrationsRun: true`.

### Root `typeorm.config.ts`

- CLI-only DataSource at monorepo root.
- Imports `ENTITIES` from `@shipshout/database`.
- Resolves migrations via a glob into `libs/database/src/lib/migrations/*` (ts/js as required by the chosen TypeORM CLI runner).
- Builds Postgres connection options from environment (e.g. `DATABASE_URL`). If credentials are missing or invalid, the CLI fails with a clear connection error — no silent defaults that could target the wrong database.
- Not part of the Nest library public API surface used by apps at runtime.

### Scripts (bun)

Root `package.json` scripts invoke TypeORM CLI via bun:

- `migration:generate` — write a new migration under `libs/database/src/lib/migrations/`
- `migration:run` — apply pending migrations
- `migration:revert` — revert the last migration

All use `-d typeorm.config.ts`. Use the TypeORM CLI entry that works with the installed `typeorm` 1.x package and TypeScript sources under bun (prefer `bunx typeorm` with the DataSource path; fall back to the documented TypeORM 1.x TS runner only if bun cannot load the config).

### Docs note

- Short note in `libs/database/README.md`: after generate, register the class in `MIGRATIONS` so Nest sees it. No runtime assert for registry drift in this pass.

## Runtime behavior

- App boot never runs migrations; schema changes are operator-driven via CLI.
- Nest lists only migrations present in `MIGRATIONS`.
- CLI run/revert operates on files matched by the glob (including newly generated files not yet exported into `MIGRATIONS`).
- Connection failures during CLI use surface as TypeORM errors.

## Testing

- Specs live under `__tests__` (e.g. `libs/database/src/lib/__tests__/database.module.spec.ts`). Move the existing module spec into `__tests__` as part of this work; adjust Jest config if needed so `__tests__` is discovered.
- Extend module tests: `forRootAsync` remains a global dynamic module; merged TypeORM options include `migrations` equal to the exported `MIGRATIONS` registry (empty initially) — no live Postgres.
- Add a unit smoke test at `libs/database/src/lib/__tests__/typeorm.config.spec.ts` that imports the root `typeorm.config.ts` and asserts it exports a `DataSource` with `type: 'postgres'`, `entities` tied to `ENTITIES`, and a migrations path/glob pointing at `libs/database/src/lib/migrations` (no live DB; set a dummy `DATABASE_URL` in the test env if the config reads it at import time).
- No integration test that runs migrations against Postgres in this pass.

## Out of scope

- `migrationsRun` / auto-migrate on boot or deploy
- Wiring `DatabaseModule` into `AppModule`
- Domain entities or first real migration content
- Seed scripts
- Runtime validation that every globbed file is registered in `MIGRATIONS`

## File layout (target)

```
typeorm.config.ts                          # repo root, CLI DataSource
libs/database/
  README.md                                # register-after-generate note
  src/
    index.ts                               # export MIGRATIONS if useful
    lib/
      database.module.ts                   # migrations: MIGRATIONS
      __tests__/
        database.module.spec.ts
      entities/
        index.ts
      migrations/
        index.ts                           # MIGRATIONS = []
      repositories/
        ...
```
