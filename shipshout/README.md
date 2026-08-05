# ShipShout

Turn GitHub releases into multi-channel marketing drafts — review, approve, and publish to X, LinkedIn, email, and more.

## Prerequisites

- [Bun](https://bun.sh) 1.x
- Docker (Postgres + Redis)
- API keys: OpenAI or Anthropic, Stripe (billing), channel OAuth credentials (optional)

## Local setup

1. Copy environment variables:

```sh
cp .env.example .env   # create .env with DATABASE_URL, REDIS_URL, APP_ENCRYPTION_KEY, etc.
```

2. Start infrastructure:

```sh
bun run docker:up
docker compose up -d postgres-test redis-test   # for integration/e2e tests
```

3. Run migrations:

```sh
bun run migrate
```

Generate a new migration from entity changes:

```sh
bun run migration:generate -- libs/data/database/src/lib/migrations/MigrationName
```

4. Start apps:

```sh
bun run dev          # API + web
bun run dev:all      # API + web + worker
```

- API: http://localhost:3000/api
- Web: http://localhost:4200
- Health: http://localhost:3000/api/health
- Lead magnet: http://localhost:4200/tools/tweet-generator

## Testing

Unit tests (all projects):

```sh
bun test
```

Integration tests (requires `postgres-test` on port 5435):

```sh
TEST_DATABASE_URL=postgres://test:test@localhost:5435/shipshout_test \
  bunx nx test api --testPathPatterns=integration
```

E2E (requires Postgres + Redis test services):

```sh
TEST_DATABASE_URL=postgres://test:test@localhost:5435/shipshout_test \
DATABASE_URL=postgres://test:test@localhost:5435/shipshout_test \
REDIS_URL=redis://localhost:6381 \
  bunx nx e2e api-e2e
```

## Deploy

1. Build images:

```sh
docker build -f apps/api/Dockerfile -t shipshout-api .
docker build -f apps/web/Dockerfile -t shipshout-web .
docker build -f apps/worker/Dockerfile -t shipshout-worker .
```

2. Run migrations against production Postgres (once per release):

```sh
DATABASE_URL=postgres://... bun run migrate
```

3. Start containers with managed Postgres + Redis, setting `DATABASE_URL`, `REDIS_URL`, `APP_ENCRYPTION_KEY`, AI keys, and Stripe secrets.

## Architecture

Nx monorepo: `apps/api` (NestJS), `apps/web` (Next.js), `apps/worker` (BullMQ consumers), shared libs under `libs/`.

Release flow: GitHub/Linear/Jira webhook → generate queue → AI drafts → dashboard review → dispatch queue → channel connectors.
