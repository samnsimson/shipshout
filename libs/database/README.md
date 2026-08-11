# database

Nest dynamic module wrapping TypeORM (Postgres).

## Building

Run `nx build database` to build the library.

## Running unit tests

Run `nx test database` to execute the unit tests via [Jest](https://jestjs.io).

## Migrations

Migration classes live in `src/lib/migrations/` as timestamp-prefixed files (e.g. `20260811100000-CreateRepositoryTables.ts`). Nest and the CLI both discover them via the shared `MIGRATIONS` glob in `src/lib/migrations/index.ts` — no manual class registry.

1. Ensure `DATABASE_URL` is set.
2. Generate: `bun run migration:generate` (builds `@shipshout/database` first, then diffs schema).
3. Apply: `bun run migration:run`
4. Revert last: `bun run migration:revert`

The CLI DataSource is `typeorm.config.ts` at the repo root. It loads **compiled** entities from `libs/database/dist` (Bun cannot emit TypeORM decorator metadata from `.ts` sources).
