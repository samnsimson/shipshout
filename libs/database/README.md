# database

Nest dynamic module wrapping TypeORM (Postgres).

## Building

Run `nx build database` to build the library.

## Running unit tests

Run `nx test database` to execute the unit tests via [Jest](https://jestjs.io).

## Migrations

Migration classes live in `src/lib/migrations/`.

1. Ensure `DATABASE_URL` is set.
2. Generate: `bun run migration:generate` (or pass a custom name path as the TypeORM CLI argument).
3. Register the new class in `src/lib/migrations/index.ts` (`MIGRATIONS` array) so Nest lists it.
4. Apply: `bun run migration:run`
5. Revert last: `bun run migration:revert`

The CLI DataSource is `typeorm.config.ts` at the repo root (glob discovery). Nest uses the explicit `MIGRATIONS` registry — both must stay in sync after generate.
