# TypeORM DatabaseModule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `@shipshout/database` into a global Nest dynamic module that boots TypeORM (Postgres) from caller-supplied connection options, owns an empty entity registry, and exports `BaseRepository`.

**Architecture:** `DatabaseModule.forRootAsync` wraps `TypeOrmModule.forRootAsync`, merging the caller's connection factory with fixed `type: 'postgres'`, `entities: ENTITIES`, and `synchronize: false`. Folders `entities/` and `repositories/` hold the registry and base repo. Remove `DatabaseService`.

**Tech Stack:** NestJS 11, `@nestjs/typeorm` 11, TypeORM 1.x, Postgres (`pg`), Jest + `@nestjs/testing`

## Global Constraints

- Callers configure connection only (no `type`, no `entities`).
- Module is `global: true`.
- No domain entities in this pass; `ENTITIES = []`.
- Do not wire into `AppModule`.
- Do not read `process.env` inside the library.
- Match repo Prettier: 4-space indent, single quotes, printWidth 160.
- Single-statement `if` bodies stay one-line without braces (workspace rule).

---

### Task 1: Entity registry + BaseRepository scaffolding

**Files:**

- Create: `libs/database/src/lib/entities/index.ts`
- Create: `libs/database/src/lib/repositories/base.repository.ts`
- Create: `libs/database/src/lib/repositories/index.ts`
- Modify: `libs/database/src/index.ts`
- Delete: `libs/database/src/lib/database.service.ts`
- Delete: `libs/database/src/lib/database.service.spec.ts`

**Interfaces:**

- Produces: `ENTITIES: Function[]` (empty array), `BaseRepository<Entity extends ObjectLiteral>`

- [ ] **Step 1: Create entity registry**

```ts
// libs/database/src/lib/entities/index.ts
export const ENTITIES: Function[] = [];
```

- [ ] **Step 2: Create BaseRepository**

```ts
// libs/database/src/lib/repositories/base.repository.ts
import { ObjectLiteral, Repository } from 'typeorm';

export class BaseRepository<Entity extends ObjectLiteral> extends Repository<Entity> {
    constructor(repository: Repository<Entity>) {
        super(repository.target, repository.manager, repository.queryRunner);
    }
}
```

- [ ] **Step 3: Barrel + public exports; remove DatabaseService**

```ts
// libs/database/src/lib/repositories/index.ts
export * from './base.repository';

// libs/database/src/index.ts
export * from './lib/database.module';
export * from './lib/entities';
export * from './lib/repositories';
```

Delete `database.service.ts` and `database.service.spec.ts`.

- [ ] **Step 4: Commit**

```bash
git add libs/database/src && git commit -m "Scaffold database entities and BaseRepository"
```

---

### Task 2: Dynamic DatabaseModule with TypeORM

**Files:**

- Create: `libs/database/src/lib/database-module.options.ts`
- Modify: `libs/database/src/lib/database.module.ts`
- Create: `libs/database/src/lib/database.module.spec.ts`
- Modify: `libs/database/package.json` (add peer/runtime deps if needed)

**Interfaces:**

- Consumes: `ENTITIES` from Task 1
- Produces:
    - `DatabaseConnectionOptions` — `Pick` of Postgres credentials (`url` | host/port/username/password/database/ssl/applicationName)
    - `DatabaseModuleAsyncOptions` — `{ imports?, inject?, useFactory: (...args) => DatabaseConnectionOptions | Promise<...> }`
    - `DatabaseModule.forRootAsync(options: DatabaseModuleAsyncOptions): DynamicModule`

- [ ] **Step 1: Write failing test**

```ts
import { DatabaseModule } from './database.module';

describe('DatabaseModule', () => {
    it('forRootAsync returns a global DynamicModule importing TypeOrm', () => {
        const dynamicModule = DatabaseModule.forRootAsync({
            useFactory: () => ({ url: 'postgres://localhost:5432/shipshout' }),
        });

        expect(dynamicModule.global).toBe(true);
        expect(dynamicModule.module).toBe(DatabaseModule);
        expect(dynamicModule.imports?.length).toBeGreaterThan(0);
    });
});
```

- [ ] **Step 2: Run test — expect fail (module still stub / missing options merge)**

Run: `npx nx test database --testPathPatterns=database.module.spec`

- [ ] **Step 3: Implement options type + module**

```ts
// database-module.options.ts
import type { ModuleMetadata, FactoryProvider } from '@nestjs/common';
import type { PostgresConnectionCredentialsOptions } from 'typeorm/driver/postgres/PostgresConnectionCredentialsOptions';

export type DatabaseConnectionOptions = Pick<
    PostgresConnectionCredentialsOptions,
    'url' | 'host' | 'port' | 'username' | 'password' | 'database' | 'ssl' | 'applicationName'
>;

export interface DatabaseModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    inject?: FactoryProvider['inject'];
    useFactory: (...args: never[]) => DatabaseConnectionOptions | Promise<DatabaseConnectionOptions>;
}
```

```ts
// database.module.ts
import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModuleAsyncOptions } from './database-module.options';
import { ENTITIES } from './entities';

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
                        const connection = await options.useFactory(...(args as never[]));
                        return {
                            ...connection,
                            type: 'postgres' as const,
                            entities: ENTITIES,
                            synchronize: false,
                        };
                    },
                }),
            ],
        };
    }
}
```

Also export options type from `src/index.ts` if useful for apps.

- [ ] **Step 4: Run test — expect pass**

Run: `npx nx test database --testPathPatterns=database.module.spec`

- [ ] **Step 5: Commit**

```bash
git add libs/database && git commit -m "Add TypeORM-backed DatabaseModule.forRootAsync"
```

---

## Self-review

1. Spec coverage: connection-only async options, global module, ENTITIES registry, BaseRepository, remove DatabaseService, unit test, no AppModule wire-up — all tasked.
2. No placeholders.
3. Types consistent: `DatabaseConnectionOptions` / `DatabaseModuleAsyncOptions` / `ENTITIES` / `BaseRepository`.
