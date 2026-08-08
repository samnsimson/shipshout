# Database TypeORM Dynamic Module Design

**Date:** 2026-08-08  
**Status:** Approved for planning  
**Library:** `@shipshout/database`

## Goal

Replace the stub `DatabaseModule` with a NestJS dynamic module that boots TypeORM against Postgres. Callers supply connection config only. The library owns entities and a shared `BaseRepository` for apps to extend.

## Decisions

| Topic | Choice |
| --- | --- |
| Config injection | Caller passes Nest-style async options (`imports` / `inject` / `useFactory`) |
| What callers configure | Connection only (e.g. `url`, or host/port/user/password/database) |
| Entity ownership | `DatabaseModule` / `libs/database` owns all entities |
| Repositories | Generic `BaseRepository<Entity>` extending TypeORM `Repository<Entity>` |
| Domain entities in this pass | None — scaffold folders and empty registry only |
| Driver | Postgres (`type: 'postgres'` fixed in the module) |
| `DatabaseService` | Remove (replaced by TypeORM + repositories) |

## Architecture

```
AppModule
  └─ DatabaseModule.forRootAsync({ imports, inject, useFactory })
       └─ TypeOrmModule.forRootAsync(...)
            • merges caller connection factory
            • adds type: 'postgres'
            • registers ENTITIES from libs/database
```

- `DatabaseModule` is `global: true` so feature modules do not re-import root TypeORM setup.
- The library does not read `process.env` itself; the app injects secrets (e.g. via `ConfigService`).

### Call-site sketch

```ts
DatabaseModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    url: config.getOrThrow<string>('DATABASE_URL'),
  }),
})
```

## Components

### `DatabaseModule` (`lib/database.module.ts`)

- Empty `@Module({})` class with static `forRootAsync(options)`.
- Options type mirrors Nest `TypeOrmModule.forRootAsync` async factory shape, but `useFactory` return type is limited to connection fields (not entities / type).
- Internally calls `TypeOrmModule.forRootAsync`, wrapping the factory so the result includes `type: 'postgres'`, `entities: ENTITIES`, and `synchronize: false`.
- Returns a `DynamicModule` with `global: true`, `module: DatabaseModule`, and the TypeORM import.

### `entities/` (`lib/entities/`)

- Folder for future TypeORM entity classes.
- `entities/index.ts` exports `ENTITIES` as an empty array for this pass.
- New entities are added as files in this folder and registered in `ENTITIES`.

### `repositories/` (`lib/repositories/`)

- `base.repository.ts`: `BaseRepository<Entity extends ObjectLiteral> extends Repository<Entity>`.
- Constructor accepts a TypeORM `Repository<Entity>` and delegates to `super(target, manager, queryRunner)` (standard Nest custom-repository pattern).
- No domain methods in this pass.
- `repositories/index.ts` barrel-exports `BaseRepository`.

### Public API (`src/index.ts`)

Re-exports:

- `DatabaseModule`
- `BaseRepository`
- Entity / repository barrels as needed

### Removed

- `DatabaseService`
- `database.service.spec.ts`

## Runtime behavior

- Connection failures surface as Nest/TypeORM bootstrap errors; no custom retry layer.
- `synchronize` defaults to `false` and is not part of the caller options API in v1.
- Apps consume data via repositories that extend `BaseRepository`, once concrete entities exist.

## Testing

- Remove the old `DatabaseService` unit test.
- Add a light unit test asserting `forRootAsync` returns a `DynamicModule` that includes TypeORM setup (no live database).

## Out of scope

- Domain entities and concrete repositories
- Wiring `DatabaseModule` into `AppModule`
- Migrations / seed scripts
- Changing or fixing the root `typeorm` package version unless install/build fails during implementation

## File layout (target)

```
libs/database/src/
  index.ts
  lib/
    database.module.ts
    database.module.spec.ts   # optional name; covers forRootAsync
    entities/
      index.ts                # ENTITIES = []
    repositories/
      base.repository.ts
      index.ts
```
