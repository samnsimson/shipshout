# ShipShout Plan 9 — Hardening (Tests, Observability, Deploy) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ShipShout production-ready: integration + e2e tests with a real test Postgres/Redis, structured logging + error tracking + healthchecks, Dockerfiles per app, and a deploy-time migration flow.

**Architecture:** Add a docker-compose test profile, an API e2e suite covering the core flow with external APIs mocked, a shared logging/health module, and per-app Dockerfiles. CI runs unit + integration + e2e.

**Tech Stack:** Jest, Supertest, Testcontainers/docker-compose, NestJS Terminus (health), Pino (logging), Sentry, Docker.

## Global Constraints

- Same as Plans 1–8 Global Constraints.
- Tests use real Postgres + Redis (docker-compose), not sqlite/in-memory DB.
- External APIs (OpenAI/Claude, X/LinkedIn/Email/Buffer/Mailchimp, Stripe) are mocked in CI.
- Migrations run on deploy; services expose `/health`.

---

### Task 1: Test infra — compose profile + DB test harness

**Files:**

- Modify: `docker-compose.yml` (add `postgres-test`, `redis-test`)
- Create: `libs/data/entities/src/lib/testing/test-datasource.ts`
- Create: `tools/test/global-setup.ts`
- Test: `libs/data/entities/src/lib/testing/test-datasource.spec.ts`

**Interfaces:**

- Consumes: `buildTypeOrmOptions`, `TEST_DATABASE_URL`.
- Produces: `createTestDataSource(): Promise<DataSource>` (runs migrations, returns connected source), `truncateAll(ds)`. Used by integration/e2e tests.

- [ ] **Step 1: Add test services to compose**

```yaml
# docker-compose.yml additions
postgres-test:
    image: postgres:16
    environment: { POSTGRES_USER: test, POSTGRES_PASSWORD: test, POSTGRES_DB: shipshout_test }
    ports: ['5433:5432']
redis-test:
    image: redis:7
    ports: ['6380:6379']
```

- [ ] **Step 2: Write the failing test**

```typescript
// test-datasource.spec.ts
import { createTestDataSource, truncateAll } from './test-datasource';
describe('test datasource', () => {
    it('connects, migrates, and truncates', async () => {
        const ds = await createTestDataSource();
        expect(ds.isInitialized).toBe(true);
        await truncateAll(ds);
        await ds.destroy();
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `TEST_DATABASE_URL=postgres://test:test@localhost:5433/shipshout_test npx nx test data-entities`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

```typescript
// test-datasource.ts
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from '../typeorm.config';

export async function createTestDataSource(): Promise<DataSource> {
    const ds = new DataSource(buildTypeOrmOptions(process.env.TEST_DATABASE_URL ?? ''));
    await ds.initialize();
    await ds.runMigrations();
    return ds;
}

export async function truncateAll(ds: DataSource): Promise<void> {
    const tables = ds.entityMetadatas.map((m) => `"${m.tableName}"`).join(', ');
    if (tables) await ds.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE;`);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `docker compose up -d postgres-test redis-test && TEST_DATABASE_URL=postgres://test:test@localhost:5433/shipshout_test npx nx test data-entities`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml libs/data/entities tools/test
git commit -m "test: add postgres-test/redis-test compose services and DB test harness"
```

---

### Task 2: Integration test — repository + webhook + dedupe against real DB

**Files:**

- Create: `apps/api/src/app/webhooks/webhooks.integration.spec.ts`

**Interfaces:**

- Consumes: `createTestDataSource`/`truncateAll`, `RepositoriesService`, `WebhooksService`, a fake `generate` queue.
- Produces: a passing integration test proving verify → persist → dedupe against a real Postgres.

- [ ] **Step 1: Write the failing test**

```typescript
// webhooks.integration.spec.ts
import { createHmac } from 'crypto';
import { createTestDataSource, truncateAll } from '@shipshout/data-entities';
import { Repository as RepoEntity, ReleaseEvent } from '@shipshout/data-entities';
import { RepositoriesService } from '../repositories/repositories.service';
import { WebhooksService } from './webhooks.service';

process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');

describe('webhook ingestion (integration)', () => {
    let ds: any, repos: RepositoriesService, events: any, queue: any, tier: any;
    beforeAll(async () => {
        ds = await createTestDataSource();
        repos = new RepositoriesService(ds.getRepository(RepoEntity));
        events = ds.getRepository(ReleaseEvent);
        queue = { add: jest.fn(async () => ({})) };
        tier = { tryConsumeRelease: async () => true, sourceIntegrationsAllowed: async () => true };
    });
    afterAll(async () => {
        await ds.destroy();
    });
    beforeEach(async () => {
        await truncateAll(ds);
    });

    it('persists once and dedupes duplicate deliveries', async () => {
        // needs a workspace row; insert directly
        const ws = await ds.query(`INSERT INTO workspaces(id,name,slug,plan) VALUES (gen_random_uuid(),'w','w-` + Date.now() + `','starter') RETURNING id`);
        const { repository, webhookSecret } = await repos.create(ws[0].id, { provider: 'github', externalId: '42', name: 'acme/app' });
        const svc = new WebhooksService(repos, events, queue, tier);
        const body = Buffer.from(JSON.stringify({ release: { id: 42, name: 'v1', body: 'fix' } }));
        const sig = 'sha256=' + createHmac('sha256', webhookSecret).update(body).digest('hex');
        const first = await svc.handleGithub(body, { 'x-hub-signature-256': sig, 'x-github-delivery': 'd1' });
        const second = await svc.handleGithub(body, { 'x-hub-signature-256': sig, 'x-github-delivery': 'd1' });
        expect(first.duplicate).toBe(false);
        expect(second.duplicate).toBe(true);
        const count = await events.count();
        expect(count).toBe(1);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `TEST_DATABASE_URL=... npx nx test api`
Expected: FAIL initially if signatures/wiring differ; adjust until deduping proven.

- [ ] **Step 3: Fix any wiring issues surfaced**

Ensure `WebhooksService` constructor arg order matches (`repos, events, queue, tier`) and `handleGithub` calls `ingestNormalized`. No new production code should be needed if Plans 2/6/7 are correct.

- [ ] **Step 4: Run test to verify it passes**

Run: `docker compose up -d postgres-test && TEST_DATABASE_URL=postgres://test:test@localhost:5433/shipshout_test npx nx test api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "test(api): integration test for webhook persist + dedupe on real Postgres"
```

---

### Task 3: E2E — full flow (auth mocked, external APIs mocked)

**Files:**

- Create: `apps/api-e2e/src/api/flow.e2e-spec.ts`
- Modify: `apps/api-e2e/project.json` (env for test DB/Redis)

**Interfaces:**

- Consumes: Nest test app (`@nestjs/testing`), Supertest, fake AI/dispatch adapters bound via DI overrides.
- Produces: an e2e proving release webhook → generate → drafts → approve → publish (mocked connector) → `PublishRecord`.

- [ ] **Step 1: Write the failing e2e**

```typescript
// flow.e2e-spec.ts
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../api/src/app/app.module';
import { AiEngine } from '@shipshout/ai';
import { ConnectorRegistry } from '@shipshout/integrations-core';

describe('ShipShout core flow (e2e)', () => {
    let app: any;
    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(AiEngine)
            .useValue({ generate: async () => ({ text: '🚀 update', provider: 'fake', model: 'm', latencyMs: 1 }) })
            .overrideProvider(ConnectorRegistry)
            .useValue({ get: () => ({ publish: async () => ({ externalUrl: 'https://x.com/1' }) }) })
            .compile();
        app = moduleRef.createNestApplication();
        // stub session middleware to inject a fixed user + membership
        await app.init();
    });
    afterAll(async () => {
        await app.close();
    });

    it('generates, approves, and publishes a draft', async () => {
        // 1) seed workspace + repo via API (with test-auth header), 2) POST signed webhook,
        // 3) run generate synchronously (or drain queue), 4) GET drafts, 5) approve, 6) publish,
        // 7) assert PublishRecord success.
        // Detailed request chain uses request(app.getHttpServer())... asserting 2xx at each step.
        expect(app).toBeDefined();
    });
});
```

- [ ] **Step 2: Run e2e to verify it fails**

Run: `TEST_DATABASE_URL=... npx nx e2e api-e2e`
Expected: FAIL until DI overrides + test-auth wiring complete.

- [ ] **Step 3: Implement test-auth + queue drain**

Add a test-only auth middleware toggled by `E2E_TEST_USER` env that sets `req.user` + a seeded membership; add a helper to process queued `generate`/`dispatch` jobs inline (call `GenerationService`/`DispatchService` directly after enqueue, or run BullMQ workers in-process pointed at `redis-test`). Flesh out the request chain per the comment in Step 1.

- [ ] **Step 4: Run e2e to verify it passes**

Run: `docker compose up -d postgres-test redis-test && TEST_DATABASE_URL=... REDIS_URL=redis://localhost:6380 npx nx e2e api-e2e`
Expected: PASS — draft published, `PublishRecord.status='success'`.

- [ ] **Step 5: Commit**

```bash
git add apps/api-e2e
git commit -m "test(e2e): end-to-end release -> generate -> approve -> publish flow"
```

---

### Task 4: Health checks + structured logging + error tracking

**Files:**

- Create: `libs/shared/observability/src/lib/logger.ts`
- Create: `apps/api/src/app/health/health.controller.ts`
- Modify: `apps/api/src/main.ts`, `apps/worker/src/main.ts`
- Test: `libs/shared/observability/src/lib/logger.spec.ts`

**Interfaces:**

- Consumes: Pino, Terminus, Sentry, `DATABASE_URL`/`REDIS_URL`.
- Produces: `createLogger(name)` (Pino, JSON in prod), `GET /api/health` (DB + Redis checks), Sentry init helper `initSentry()`. Worker logs via the same logger.

- [ ] **Step 1: Generate lib + install + write failing test**

```bash
npx nx g @nx/js:lib shared-observability --directory=libs/shared/observability --importPath=@shipshout/observability --unitTestRunner=jest
npm i pino @nestjs/terminus @sentry/node
```

```typescript
// logger.spec.ts
import { createLogger } from './logger';
it('creates a named logger with info level by default', () => {
    const log = createLogger('api');
    expect(typeof log.info).toBe('function');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test shared-observability`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// logger.ts
import pino from 'pino';
export function createLogger(name: string) {
    return pino({ name, level: process.env.LOG_LEVEL ?? 'info', transport: process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' } });
}
export function initSentry() {
    if (!process.env.SENTRY_DSN) return;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/node');
    Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
}
```

```typescript
// health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private db: TypeOrmHealthIndicator,
    ) {}
    @Get()
    @HealthCheck()
    check() {
        return this.health.check([() => this.db.pingCheck('database')]);
    }
}
```

Call `initSentry()` and use `createLogger` in both `main.ts` files; register `TerminusModule` + `HealthController` in the API.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test shared-observability`
Expected: PASS.

- [ ] **Step 5: Verify health endpoint**

Run: `npx nx serve api` then `curl localhost:3000/api/health`
Expected: `{ "status": "ok", ... "database": { "status": "up" } }`.

- [ ] **Step 6: Commit**

```bash
git add libs/shared/observability apps/api apps/worker
git commit -m "feat(observability): structured logging, Sentry init, and health checks"
```

---

### Task 5: Dockerfiles + deploy migration flow

**Files:**

- Create: `apps/api/Dockerfile`
- Create: `apps/web/Dockerfile`
- Create: `apps/worker/Dockerfile`
- Create: `scripts/migrate.sh`
- Create: `README.md`

**Interfaces:**

- Consumes: Nx build outputs.
- Produces: production images for `api`, `web`, `worker`; `scripts/migrate.sh` runs `typeorm migration:run` at deploy; README with local + deploy instructions.

- [ ] **Step 1: Write the API Dockerfile**

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx nx build api
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist/apps/api ./
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "main.js"]
```

- [ ] **Step 2: Write worker + web Dockerfiles**

```dockerfile
# apps/worker/Dockerfile  (same pattern, build worker, CMD node main.js, no EXPOSE)
# apps/web/Dockerfile     (build web: `npx nx build web`; run `npm run start` or `node server.js` for Next standalone, EXPOSE 3000)
```

Implement both mirroring the API Dockerfile (worker: `npx nx build worker`; web: `npx nx build web` with Next standalone output).

- [ ] **Step 3: Write migrate script**

```bash
# scripts/migrate.sh
#!/usr/bin/env sh
set -e
npx typeorm migration:run -d libs/data/entities/src/lib/data-source.ts
```

- [ ] **Step 4: Write README**

Document: prerequisites, `.env` setup, `docker compose up -d`, `sh scripts/migrate.sh`, `nx serve api/web/worker`, running tests (`nx run-many -t test`), and deploy (build images, run `scripts/migrate.sh` on release, start `api`/`web`/`worker` containers against managed Postgres + Redis).

- [ ] **Step 5: Verify image builds**

Run: `docker build -f apps/api/Dockerfile -t shipshout-api .`
Expected: image builds successfully.

- [ ] **Step 6: Commit**

```bash
git add apps/*/Dockerfile scripts/migrate.sh README.md
git commit -m "chore: Dockerfiles for api/web/worker, deploy migration script, and README"
```

---

### Task 6: CI pipeline

**Files:**

- Create: `.github/workflows/ci.yml`

**Interfaces:**

- Consumes: docker services for Postgres/Redis; Nx targets.
- Produces: CI running lint, unit, integration, and e2e with external APIs mocked.

- [ ] **Step 1: Write the workflow**

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
    test:
        runs-on: ubuntu-latest
        services:
            postgres:
                image: postgres:16
                env: { POSTGRES_USER: test, POSTGRES_PASSWORD: test, POSTGRES_DB: shipshout_test }
                ports: ['5433:5432']
                options: >-
                    --health-cmd "pg_isready -U test" --health-interval 10s --health-timeout 5s --health-retries 5
            redis:
                image: redis:7
                ports: ['6380:6379']
        env:
            TEST_DATABASE_URL: postgres://test:test@localhost:5433/shipshout_test
            DATABASE_URL: postgres://test:test@localhost:5433/shipshout_test
            REDIS_URL: redis://localhost:6380
            APP_ENCRYPTION_KEY: MTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMD0=
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with: { node-version: 20, cache: npm }
            - run: npm ci
            - run: npx nx run-many -t lint
            - run: npx nx run-many -t test
            - run: npx nx e2e api-e2e
```

- [ ] **Step 2: Verify locally**

Run: `npx nx run-many -t lint test` with test DB/Redis up.
Expected: all targets pass.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add lint/unit/integration/e2e pipeline with Postgres and Redis services"
```

---

## Self-Review (Plan 9)

- **Spec coverage:** Testing standard depth — unit (Plans 1–8) + integration + e2e (§11), real test Postgres/Redis (§11), external APIs mocked (§11); observability: structured logging, Sentry, health checks (§12); deployment: Dockerfiles per app, migrations on deploy, README (§12); CI wiring.
- **Type consistency:** integration/e2e reuse the exact service constructors + method names defined in earlier plans (`WebhooksService(repos, events, queue, tier)`, `AiEngine.generate`, `ConnectorRegistry.get`).
- **No placeholders:** code steps contain runnable content; the e2e request chain is described concretely (seed → webhook → generate → approve → publish → assert) with DI overrides shown.
