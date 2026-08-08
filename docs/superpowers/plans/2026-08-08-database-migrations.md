# Database Migrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire TypeORM migrations into `@shipshout/database` (explicit `MIGRATIONS` registry for Nest) and add a repo-root CLI DataSource plus bun scripts to generate/run/revert migrations without auto-running on boot.

**Architecture:** Nest `DatabaseModule.forRootAsync` merges `migrations: MIGRATIONS` from `libs/database/src/lib/migrations/`. Root `typeorm.config.ts` is CLI-only: reads `DATABASE_URL` from env, uses `ENTITIES` from the lib, and discovers migration files via a timestamp glob (so `migrations/index.ts` is not treated as a migration). Specs live under `__tests__/`.

**Tech Stack:** NestJS 11, `@nestjs/typeorm` 11, TypeORM 1.1.x, Postgres (`pg`), bun / bunx, Jest + `@nestjs/testing`

## Global Constraints

- Scope: config wiring + CLI only — never set `migrationsRun: true`.
- Migration files live in `libs/database/src/lib/migrations/`.
- Nest discovery: explicit `MIGRATIONS: Function[]` registry (empty initially).
- CLI discovery: glob on timestamp-prefixed migration files under that folder.
- Nest library APIs do not read `process.env`; root `typeorm.config.ts` may read `DATABASE_URL` and must throw if missing.
- Package manager: bun / bunx.
- Spec files under `__tests__` directories.
- Do not wire into `AppModule`; no domain entities; no seed scripts.
- Match repo Prettier: 4-space indent, single quotes, printWidth 160.
- Single-statement `if` bodies stay one-line without braces (workspace rule).

## File map

| File | Responsibility |
| --- | --- |
| `libs/database/src/lib/migrations/index.ts` | Export empty `MIGRATIONS` registry |
| `libs/database/src/lib/build-typeorm-options.ts` | Pure merge of connection + fixed TypeORM options (entities, migrations, synchronize) |
| `libs/database/src/lib/database.module.ts` | Call `buildTypeOrmOptions` inside `forRootAsync` factory |
| `libs/database/src/index.ts` | Re-export migrations barrel |
| `libs/database/src/lib/__tests__/database.module.spec.ts` | Module + options tests (moved from beside module) |
| `libs/database/src/lib/__tests__/typeorm.config.spec.ts` | Smoke-test root CLI DataSource |
| `typeorm.config.ts` | Root CLI `DataSource` (env + glob) |
| `package.json` | bun migration scripts |
| `libs/database/README.md` | Register-after-generate note |
| `libs/database/tsconfig.lib.json` / `tsconfig.spec.json` | Exclude/include `__tests__` correctly |

---

### Task 1: Migrations registry + Nest TypeORM options

**Files:**
- Create: `libs/database/src/lib/migrations/index.ts`
- Create: `libs/database/src/lib/build-typeorm-options.ts`
- Modify: `libs/database/src/lib/database.module.ts`
- Modify: `libs/database/src/index.ts`
- Create: `libs/database/src/lib/__tests__/database.module.spec.ts`
- Delete: `libs/database/src/lib/database.module.spec.ts`
- Modify: `libs/database/tsconfig.lib.json` (exclude `__tests__` and specs under it)
- Modify: `libs/database/tsconfig.spec.json` (include `__tests__` specs)

**Interfaces:**
- Consumes: `ENTITIES` from `./entities`, `DatabaseConnectionOptions` from `./database-module.options`
- Produces:
  - `MIGRATIONS: Function[]`
  - `buildTypeOrmOptions(connection: DatabaseConnectionOptions)` returning `{ ...connection, type: 'postgres', entities: ENTITIES, migrations: MIGRATIONS, synchronize: false }`

- [ ] **Step 1: Move existing spec under `__tests__` and write failing migrations assertion**

Create `libs/database/src/lib/__tests__/database.module.spec.ts`:

```ts
import { DatabaseModule } from '../database.module';
import { buildTypeOrmOptions } from '../build-typeorm-options';
import { MIGRATIONS } from '../migrations';

describe('DatabaseModule', () => {
    it('forRootAsync returns a global DynamicModule importing TypeOrm', () => {
        const dynamicModule = DatabaseModule.forRootAsync({
            useFactory: () => ({ url: 'postgres://localhost:5432/shipshout' }),
        });

        expect(dynamicModule.global).toBe(true);
        expect(dynamicModule.module).toBe(DatabaseModule);
        expect(dynamicModule.imports?.length).toBeGreaterThan(0);
    });

    it('buildTypeOrmOptions registers MIGRATIONS and disables synchronize', () => {
        const options = buildTypeOrmOptions({ url: 'postgres://localhost:5432/shipshout' });

        expect(options.type).toBe('postgres');
        expect(options.synchronize).toBe(false);
        expect(options.migrations).toBe(MIGRATIONS);
        expect(options.migrations).toEqual([]);
    });
});
```

Delete `libs/database/src/lib/database.module.spec.ts`.

Update `tsconfig.spec.json` `include` to keep discovering specs (already has `src/**/*.spec.ts` — covers `__tests__`).

Update `tsconfig.lib.json` `exclude` to:

```json
"exclude": ["jest.config.ts", "jest.config.cts", "src/**/*.spec.ts", "src/**/*.test.ts", "src/**/__tests__/**"]
```

- [ ] **Step 2: Run test — expect fail**

Run: `bunx nx test database --testPathPatterns=database.module.spec`

Expected: FAIL because `build-typeorm-options` / `migrations` are missing (or `buildTypeOrmOptions` is not defined).

- [ ] **Step 3: Implement registry, builder, and module wiring**

```ts
// libs/database/src/lib/migrations/index.ts
export const MIGRATIONS: Function[] = [];
```

```ts
// libs/database/src/lib/build-typeorm-options.ts
import type { DatabaseConnectionOptions } from './database-module.options';
import { ENTITIES } from './entities';
import { MIGRATIONS } from './migrations';

export function buildTypeOrmOptions(connection: DatabaseConnectionOptions) {
    return {
        ...connection,
        type: 'postgres' as const,
        entities: ENTITIES,
        migrations: MIGRATIONS,
        synchronize: false,
    };
}
```

```ts
// libs/database/src/lib/database.module.ts
import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildTypeOrmOptions } from './build-typeorm-options';
import { DatabaseModuleAsyncOptions } from './database-module.options';

@Module({})
export class DatabaseModule {
    static forRootAsync(options: DatabaseModuleAsyncOptions): DynamicModule {
        return {
            global: true,
            module: DatabaseModule,
            imports: [
                TypeOrmModule.forRootAsync({
                    imports: options.imports,
                    inject: options.inject,
                    useFactory: async (...args: unknown[]) => {
                        const connection = await options.useFactory(...args);
                        return buildTypeOrmOptions(connection);
                    },
                }),
            ],
        };
    }
}
```

```ts
// libs/database/src/index.ts — ensure migrations are exported
export * from './lib/database.module';
export * from './lib/database-module.options';
export * from './lib/entities';
export * from './lib/migrations';
export * from './lib/repositories';
```

- [ ] **Step 4: Run test — expect pass**

Run: `bunx nx test database --testPathPatterns=database.module.spec`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add libs/database
git commit -m "$(cat <<'EOF'
Add MIGRATIONS registry and wire into DatabaseModule.

EOF
)"
```

---

### Task 2: Root CLI DataSource + bun scripts + docs

**Files:**
- Create: `typeorm.config.ts`
- Create: `libs/database/src/lib/__tests__/typeorm.config.spec.ts`
- Modify: `package.json` (scripts)
- Modify: `libs/database/README.md`

**Interfaces:**
- Consumes: `ENTITIES` from `./libs/database/src/lib/entities` (relative import for CLI/ts-node reliability)
- Produces: default-exported `DataSource` for TypeORM CLI `-d typeorm.config.ts`
- Scripts: `migration:generate`, `migration:run`, `migration:revert` via `bunx typeorm-ts-node-commonjs`

- [ ] **Step 1: Write failing DataSource smoke test**

Create `libs/database/src/lib/__tests__/typeorm.config.spec.ts`:

```ts
import { ENTITIES } from '../entities';

describe('typeorm.config', () => {
    const previousUrl = process.env.DATABASE_URL;

    afterEach(() => {
        if (previousUrl === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = previousUrl;

        // Clear module cache so each test re-evaluates env
        jest.resetModules();
    });

    it('exports a postgres DataSource using ENTITIES and migrations glob', async () => {
        process.env.DATABASE_URL = 'postgres://localhost:5432/shipshout';

        const { default: dataSource } = await import('../../../../../typeorm.config');

        expect(dataSource.options.type).toBe('postgres');
        expect(dataSource.options.entities).toBe(ENTITIES);
        expect(dataSource.options.synchronize).toBe(false);

        const migrations = dataSource.options.migrations;
        expect(migrations).toBeDefined();
        expect(Array.isArray(migrations)).toBe(true);
        expect(String((migrations as string[])[0])).toContain('libs/database/src/lib/migrations');
    });

    it('throws when DATABASE_URL is missing', async () => {
        delete process.env.DATABASE_URL;

        await expect(import('../../../../../typeorm.config')).rejects.toThrow(/DATABASE_URL/);
    });
});
```

Note: if dynamic `import` of root config is awkward under Jest path mapping, load via `require` with an absolute path from `process.cwd()`:

```ts
const dataSource = require(`${process.cwd()}/typeorm.config.ts`).default;
```

Prefer whatever works first with `bunx nx test database`; keep assertions the same. If Jest cannot load `.ts` from outside `src`, add a tiny re-export test double only as a last resort — prefer fixing Jest/`ts-node` load of the real file.

- [ ] **Step 2: Run test — expect fail**

Run: `bunx nx test database --testPathPatterns=typeorm.config.spec`

Expected: FAIL (file missing or `DATABASE_URL` guard missing).

- [ ] **Step 3: Implement `typeorm.config.ts`, scripts, and README**

```ts
// typeorm.config.ts (repo root)
import { DataSource } from 'typeorm';
import { ENTITIES } from './libs/database/src/lib/entities';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required for TypeORM CLI');

export default new DataSource({
    type: 'postgres',
    url,
    entities: ENTITIES,
    // Timestamp-prefixed files only — excludes migrations/index.ts registry
    migrations: ['libs/database/src/lib/migrations/[0-9]*.{ts,js}'],
    synchronize: false,
});
```

Add to root `package.json` `scripts` (merge with existing keys):

```json
"migration:generate": "bunx typeorm-ts-node-commonjs migration:generate ./libs/database/src/lib/migrations/Migration -d ./typeorm.config.ts",
"migration:run": "bunx typeorm-ts-node-commonjs migration:run -d ./typeorm.config.ts",
"migration:revert": "bunx typeorm-ts-node-commonjs migration:revert -d ./typeorm.config.ts"
```

Update `libs/database/README.md` to document migrations:

```md
# database

Nest dynamic module wrapping TypeORM (Postgres).

## Migrations

Migration classes live in `src/lib/migrations/`.

1. Ensure `DATABASE_URL` is set.
2. Generate: `bun run migration:generate` (or pass a custom name path as the TypeORM CLI argument).
3. Register the new class in `src/lib/migrations/index.ts` (`MIGRATIONS` array) so Nest lists it.
4. Apply: `bun run migration:run`
5. Revert last: `bun run migration:revert`

The CLI DataSource is `typeorm.config.ts` at the repo root (glob discovery). Nest uses the explicit `MIGRATIONS` registry — both must stay in sync after generate.
```

Keep existing Building / Running unit tests sections if still accurate.

- [ ] **Step 4: Run tests — expect pass**

Run: `bunx nx test database`

Expected: all database tests PASS (module + typeorm config).

Also verify CLI help wiring (no DB required):

Run: `bunx typeorm-ts-node-commonjs migration:show -d ./typeorm.config.ts`

Expected: either connects and shows empty migrations, or fails on connection to Postgres — but **must** load the DataSource successfully enough that a missing-config error does not appear. If `DATABASE_URL` is unset, expect the thrown `DATABASE_URL is required` message. Set a dummy URL to confirm config loads:

```bash
DATABASE_URL=postgres://localhost:5432/shipshout bunx typeorm-ts-node-commonjs migration:show -d ./typeorm.config.ts
```

Connection refusal from Postgres is OK; `Cannot find module` / syntax errors are not.

- [ ] **Step 5: Commit**

```bash
git add typeorm.config.ts package.json libs/database/README.md libs/database/src/lib/__tests__/typeorm.config.spec.ts
git commit -m "$(cat <<'EOF'
Add TypeORM CLI DataSource and bun migration scripts.

EOF
)"
```

---

## Self-review

1. **Spec coverage:** Nest `MIGRATIONS` + module wiring (Task 1); split CLI glob DataSource (Task 2); bun scripts (Task 2); no `migrationsRun`; no env in Nest APIs; specs under `__tests__`; README register-after-generate; no AppModule / domain entities / seeds — covered.
2. **Placeholders:** None; concrete code and commands in every step.
3. **Type consistency:** `MIGRATIONS: Function[]`, `buildTypeOrmOptions(connection: DatabaseConnectionOptions)`, default-exported `DataSource`, scripts use `-d ./typeorm.config.ts`.
