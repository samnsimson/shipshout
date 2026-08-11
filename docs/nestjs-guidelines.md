# NestJS Project Guidelines (Shipshout)

Agents and contributors **must** follow this document when creating or changing NestJS applications and libraries in this monorepo.

Canonical path: `docs/nestjs-guidelines.md`

---

## 1. Workspace shape

| Kind         | Location                     | Package name                       | Notes                                         |
| ------------ | ---------------------------- | ---------------------------------- | --------------------------------------------- |
| HTTP API app | `apps/shipshout-api-svc`     | `@shipshout/shipshout-api-svc`     | Nest bootstrap, controllers, app-level wiring |
| API e2e      | `apps/shipshout-api-svc-e2e` | `@shipshout/shipshout-api-svc-e2e` | Jest e2e against the API                      |
| Shared libs  | `libs/<name>`                | `@shipshout/<name>`                | Reusable Nest modules, domain infra           |

- Manage packages with **bun** (`bun`, `bunx`). Prefer `bun nx …` / `bunx nx …` over `npx nx …`.
- Use Nx generators/move tools for new apps/libs and renames; do not hand-copy project scaffolding unless Nx cannot do the job.
- Public library entry is `libs/<name>/src/index.ts` — export only the intentional public API.

### Creating a new Nest library (required)

Always scaffold new Nest libraries with this exact generator invocation (replace `<name>`):

```sh
bun nx generate @nx/nest:library \
  --directory=libs/<name> \
  --buildable=true \
  --unitTestRunner=jest \
  --global=true \
  --importPath=@shipshout/<name> \
  --name=<name> \
  --useProjectJson=true \
  --no-interactive
```

- Do **not** create `libs/<name>` by hand or via a different generator unless this command cannot run.
- After generation, apply folder grouping (§4), public exports via `src/index.ts`, and the rest of these guidelines.
- Import the package as `@shipshout/<name>` from apps and other libs.

---

## 2. Nest version & stack

- NestJS **11**, `@nestjs/common` / `@nestjs/core` / `@nestjs/platform-express`.
- Config: `@nestjs/config` when apps need env-backed settings.
- HTTP validation: `class-validator` + `class-transformer` on DTOs; enable a global `ValidationPipe` when adding request bodies/query DTOs.
- OpenAPI: `@nestjs/swagger` — all HTTP endpoints and DTOs must be documented (see §7).
- Database: **TypeORM** via `@shipshout/database` (Postgres). Do not introduce a second ORM.

---

## 3. Apps vs libraries

### Apps (`apps/*`)

- Own bootstrap (`main.ts`), `AppModule`, HTTP concerns, and **wiring** of library dynamic modules.
- May read env via `ConfigModule` / `ConfigService` (or equivalent) and pass values into libraries.
- Keep feature code in feature modules as the app grows; do not dump everything into `AppModule` forever.
- Do not add a global HTTP prefix unless intentionally changing the public API (see `main.ts`).

### Libraries (`libs/*`)

- Prefer Nest **dynamic modules** (`forRoot` / `forRootAsync`) for anything that needs caller configuration.
- **Do not** read `process.env` inside libraries. Callers inject connection/config through `imports` / `inject` / `useFactory`.
- Keep libraries free of app-specific routes/controllers unless the library is explicitly a transport adapter.

---

## 4. Folder structure & grouping

Group files by **role** in plural, lowercase folders. Do not leave controllers, services, DTOs, etc. as siblings in a flat feature root once more than one role exists.

### Standard role folders

| Folder          | Contains                                                                       |
| --------------- | ------------------------------------------------------------------------------ |
| `controllers/`  | HTTP (or RPC) controllers                                                      |
| `services/`     | `@Injectable()` application/domain services                                    |
| `dto/`          | Request/response DTOs (`class-validator` / `class-transformer`)                |
| `entities/`     | TypeORM entity classes (prefer owning these in `@shipshout/database` — see §6) |
| `repositories/` | Custom repositories extending `BaseRepository`                                 |
| `guards/`       | AuthZ/AuthN and other guards                                                   |
| `pipes/`        | Custom pipes                                                                   |
| `interceptors/` | Interceptors                                                                   |
| `filters/`      | Exception filters                                                              |
| `middleware/`   | Nest middleware                                                                |
| `factories/`    | Provider factories, factory functions used by dynamic modules / DI             |
| `decorators/`   | Custom parameter/method/class decorators                                       |
| `constants/`    | Injection tokens, static maps, non-secret constants                            |
| `interfaces/`   | Shared TS interfaces/types that are not DTOs                                   |
| `migrations/`   | TypeORM migrations (`@shipshout/database` only)                                |
| `__tests__/`    | Unit/integration specs for that module/lib area                                |

Create a folder only when you add the first file of that kind. Do not pre-create empty role folders “for later.”

### Feature modules (apps)

Organize by **feature**, then by **role** inside the feature:

```text
apps/shipshout-api-svc/src/
  main.ts
  app/
    app.module.ts                 # root wiring only
  <feature>/                      # e.g. users/, shipments/
    <feature>.module.ts
    controllers/
      <name>.controller.ts
    services/
      <name>.service.ts
    dto/
      create-<name>.dto.ts
      <name>-response.dto.ts
    guards/                       # feature-scoped guards only
    factories/
    __tests__/
      <name>.service.spec.ts
```

- Root `app/` stays thin: `AppModule` imports feature modules; avoid growing `app.controller.ts` / `app.service.ts` into a dumping ground — migrate real features into `<feature>/…` folders.
- Cross-cutting HTTP pieces used by many features (e.g. a global auth guard) may live under `src/common/<role>/` (`src/common/guards/`, `src/common/filters/`, …), not inside a single feature.
- File names stay role-suffixed: `users.controller.ts`, `users.service.ts`, `create-user.dto.ts`.

### Libraries (`libs/<name>/src`)

```text
libs/<name>/src/
  index.ts                        # public API barrel only
  lib/
    <name>.module.ts              # or forRoot(Async) module
    <name>-module.options.ts      # beside the module when dynamic
    controllers/                  # only if the lib exposes transport
    services/
    dto/
    entities/                     # database lib owns TypeORM entities
    repositories/
    guards/
    factories/
    migrations/                   # database lib
    __tests__/
```

- Export from `src/index.ts` (and optional role barrels like `repositories/index.ts`) — consumers import `@shipshout/<name>`, not deep private paths, unless the package explicitly documents a subpath.
- **TypeORM entities and DB repositories** belong in `@shipshout/database` (`libs/database/src/lib/entities`, `…/repositories`). Feature libs/apps consume them; do not duplicate entity classes under the API app.

### Grouping rules (agents)

1. New controller → `controllers/`; new service → `services/`; new DTO → `dto/`; same for guards, factories, pipes, etc.
2. Never mix roles in one folder (no `dto` files inside `controllers/`).
3. Prefer one primary class per file; co-locate small helper types next to the class only when they are private to that file.
4. Specs go in the nearest `__tests__/` (feature or `lib/__tests__`), not beside production files as `*.spec.ts` siblings once a `__tests__` folder exists for that area.
5. When moving existing flat files into role folders, update the feature/lib module imports in the same change.

---

## 5. Module & DI conventions

```ts
// Feature module skeleton
@Module({
    imports: [
        /* other modules */
    ],
    controllers: [FeatureController],
    providers: [FeatureService, FeatureRepository],
    exports: [FeatureService], // export services, never the module itself
})
export class FeatureModule {}
```

- Every injectable class uses `@Injectable()` and is listed in `providers` (or registered via a dynamic module).
- Export the **service/provider**, not the module class, from `exports`.
- Prefer constructor injection. Avoid `ModuleRef` / request-scoped providers unless there is a clear need.
- For circular dependencies: prefer extracting a shared module; use `forwardRef()` on **both** sides only when unavoidable.
- Custom DI tokens: use `Symbol` (or `const` injection tokens), not magic strings, when not injecting a class.

### Dynamic modules

Match the existing `DatabaseModule.forRootAsync` style:

- Options type lives beside the module (e.g. `*-module.options.ts`).
- `useFactory` may use Nest’s loose inject typing (`any[]` / `unknown[]`) when mirroring TypeORM/Nest async options.
- Return `{ global?, module, imports, providers, exports }` as needed.
- Root infrastructure that every feature needs (e.g. DB) may be `global: true` so feature modules do not re-import it.

---

## 6. Database (`@shipshout/database`)

Follow the library’s design; do not bypass it.

| Concern           | Rule                                                                                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connection        | Apps call `DatabaseModule.forRootAsync({ imports, inject, useFactory })` with **connection-only** options (`url` or host/port/user/password/database/ssl/applicationName). |
| Driver / entities | Library fixes `type: 'postgres'`, discovers entities via glob, sets `synchronize: false`. Callers must not pass `type` or `entities`.                                       |
| Entity ownership  | New entities live under `libs/database/src/lib/entities/` as `*.entity.ts` (picked up by the glob).                                                                         |
| Repositories      | Extend `BaseRepository<Entity>`; do not reinvent TypeORM repository wrapping.                                                                                              |
| Migrations (Nest) | Discovered via `path.join(__dirname, 'migrations/**/*.{ts,js}')` in `buildTypeOrmOptions`.                                                                                 |
| Migrations (CLI)  | Repo-root `typeorm.config.ts` + bun scripts `migration:generate` / `migration:run` / `migration:revert`. Requires `DATABASE_URL`.                                          |
| Auto-migrate      | **Never** enable `migrationsRun` on boot unless a dedicated decision says otherwise.                                                                                       |
| Env               | Library Nest APIs do not read `process.env`; only the CLI DataSource may.                                                                                                  |

Wire `DatabaseModule` into `AppModule` only when intentionally connecting the API to Postgres (pass config from `ConfigService`).

New migration files must live under `libs/database/src/lib/migrations/` so the shared glob picks them up — no manual class registry.
New entity files must be named `*.entity.ts` under `libs/database/src/lib/entities/` for the same reason.

---

## 7. Controllers, DTOs, HTTP, and OpenAPI

- Controllers stay thin: validate/transform input, call services, return DTOs/views.
- Business logic belongs in services (or domain helpers), not controllers.
- Use Nest HTTP exceptions (`NotFoundException`, `BadRequestException`, etc.) for expected failures.
- Do not leak raw ORM entities across HTTP boundaries once domain models exist — map to response DTOs.
- Preserve existing route shapes unless the task is an intentional API change.
- Place controllers under `controllers/`, DTOs under `dto/`, services under `services/` (see §4).

### OpenAPI / Swagger (required)

Every HTTP API endpoint must be **OpenAPI-ready** via `@nestjs/swagger` (already a workspace dependency). Agents must decorate controllers and DTOs so the generated document is complete — no undocumented routes.

**Bootstrap (API apps)**

- Register Swagger in `main.ts` with `DocumentBuilder` + `SwaggerModule.setup` (typical path: `/docs` alongside the global `api` prefix — pick one path and keep it consistent).
- Use `SwaggerModule.createDocument(app, config)` after `NestFactory.create`.
- Prefer enabling a global `ValidationPipe` (`whitelist`, `transform`) alongside Swagger so DTO metadata matches runtime validation.

**Controllers**

- `@ApiTags('<feature>')` on each controller.
- Every handler: `@ApiOperation({ summary, description? })`.
- Every handler: `@ApiResponse` (or `@ApiOkResponse` / `@ApiCreatedResponse` / `@ApiNoContentResponse`, etc.) for success **and** documented error statuses clients should expect (`400`, `401`, `403`, `404`, …).
- Auth-protected routes: `@ApiBearerAuth()` (or the project’s security scheme) on the handler or controller.
- Params/query/body: use `@ApiParam` / `@ApiQuery` when not fully inferred from DTO/`Parse*` pipes; always type body/query with DTO classes, not inline anonymous types.

**DTOs**

- Request and response DTO properties use `@ApiProperty` / `@ApiPropertyOptional` with `description`, and `example` where helpful.
- Enums: expose via `enum` on `@ApiProperty`.
- Nested objects: use typed nested DTO classes + `@ApiProperty({ type: () => NestedDto })` (or equivalent) so the OpenAPI schema is correct.
- Do not rely on bare interfaces for HTTP payloads — Swagger needs classes (or explicit schema).

**Definition of done for an endpoint**

- [ ] Route appears in the Swagger UI / OpenAPI JSON with correct method and path.
- [ ] Operation summary (and auth, if any) is set.
- [ ] Request body/query/path schemas are complete.
- [ ] Success and relevant error responses are declared.
- [ ] DTO fields are annotated for the schema.

When adding or changing an endpoint, update Swagger decorators in the **same** change as the controller/DTO code.

---

## 8. Testing

Validation order for Nest work:

1. Typecheck / build (`bunx nx run <project>:typecheck` or build)
2. Unit tests (`bunx nx test <project>`)
3. E2E when HTTP/bootstrap behavior changes (`bunx nx e2e @shipshout/shipshout-api-svc-e2e`)

Conventions:

- Unit specs live under `__tests__/` (e.g. `libs/database/src/lib/__tests__/…`). Prefer that layout for new Nest/lib tests.
- Use `@nestjs/testing` (`Test.createTestingModule`) for Nest providers.
- Mock repositories with `getRepositoryToken(Entity)` (or project helpers); do not hit a real database in unit tests.
- Keep e2e against a running/buildable API; do not couple unit tests to Postgres.

---

## 9. Code style (non-negotiable)

- Prettier: **4-space** indent, **single quotes**, `printWidth` **160** (see `.prettierrc`).
- Single-statement `if` bodies stay on one line **without** braces; multi-statement bodies use braces (workspace rule).
- Prefer normal `import { Type }` for type-only symbols; do **not** enable `verbatimModuleSyntax` or force `import type` (see `tsconfig.base.json`).
- Match neighboring file structure and naming (`*.module.ts`, `*.controller.ts`, `*.service.ts`, `*-module.options.ts`).
- Keep role folders plural and lowercase (`controllers`, `services`, `dto`, `repositories`, …).

---

## 10. Agent workflow checklist

Before finishing Nest-related work:

- [ ] Change belongs in the correct app vs lib boundary.
- [ ] New libraries were created with the §1 `@nx/nest:library` generator command (not hand-scaffolded).
- [ ] New files sit in the correct role folder (`controllers/`, `services/`, `dto/`, `repositories/`, `guards/`, `factories/`, …) per §4.
- [ ] Every new/changed HTTP endpoint has Swagger/OpenAPI decorators (controller + DTOs) per §7.
- [ ] Libraries still avoid `process.env`; apps inject config.
- [ ] Modules list providers/exports correctly; no circular deps without justification.
- [ ] Database changes go through `@shipshout/database` (entities, migration globs, `BaseRepository`).
- [ ] Tests updated or added under `__tests__/` where applicable; suite is green.
- [ ] Formatting and `if` style match project rules.
- [ ] No drive-by refactors unrelated to the task.
- [ ] Do not wire unused modules into `AppModule` “for later” without being asked.

---

## 11. Quick command reference

```sh
bunx nx serve @shipshout/shipshout-api-svc
bunx nx test @shipshout/shipshout-api-svc
bunx nx test database
bunx nx e2e @shipshout/shipshout-api-svc-e2e
bun nx generate @nx/nest:library --directory=libs/<name> --buildable=true --unitTestRunner=jest --global=true --importPath=@shipshout/<name> --name=<name> --useProjectJson=true --no-interactive
DATABASE_URL=postgres://… bun run migration:generate
DATABASE_URL=postgres://… bun run migration:run
```

When Nest DI errors appear (“Nest can’t resolve dependencies…”), fix provider registration/exports first — do not paper over with `ModuleRef` hacks.
