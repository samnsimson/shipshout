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
bun run migration:run
```

Generate a new migration from entity changes:

```sh
bun run migration:gen -- libs/data/database/src/lib/migrations/MigrationName
```

4. Start apps:

```sh
bun run dev          # API + web + worker (required for draft generation)
bun run dev:web-api  # API + web only (no background jobs)
```

- API: http://localhost:3000/api
- Web: http://localhost:4200
- Health: http://localhost:3000/api/health
- Lead magnet: http://localhost:4200/tools/tweet-generator

## GitHub repository connect

When `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, and `GITHUB_APP_SLUG` are set, **Connect with GitHub** uses the GitHub App install flow. GitHub prompts users to approve **Metadata (read)** and **Administration (read & write)** permissions; ShipShout then registers release webhooks automatically.

Configure these once in your GitHub App → **Permissions & events**:
- **Metadata:** Read-only
- **Administration:** Read and write

Also set the App webhook URL in **General** (see `.env.example`). Without the App, OAuth connect auto-registers per-repo webhooks (requires repo admin access).

Draft generation triggers on **GitHub Release published** events. Local dev (`localhost` API URL) cannot receive GitHub webhooks unless you tunnel the API.

## User authentication

Sign-in methods: **GitHub**, **Google**, and **email/password** (with email verification). Sessions use the API cookie (`connect.sid`).

Configure in `.env`:

| Variable | Purpose |
|---|---|
| `GITHUB_CLIENT_*` | GitHub OAuth login |
| `GOOGLE_CLIENT_*` | Google OAuth login |
| `RESEND_API_KEY` + `AUTH_EMAIL_FROM` | Verification and password-reset emails (platform-level, not workspace Resend keys) |
| `SESSION_SECRET` | Session signing |

**Email/password flow:** register at `/signup` → verify via email link → sign in at `/login`. Password reset at `/forgot-password`.

**Account linking:** Settings → Account (`/{workspaceId}/settings/account`) — connect GitHub, Google, or add a password to the same user.

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
DATABASE_URL=postgres://... bun run migration:run
```

3. Start containers with managed Postgres + Redis, setting `DATABASE_URL`, `REDIS_URL`, `APP_ENCRYPTION_KEY`, AI keys, and Stripe secrets.

## Architecture

Nx monorepo: `apps/api` (NestJS), `apps/web` (Next.js), `apps/worker` (BullMQ consumers), shared libs under `libs/`.

Release flow: GitHub/Linear/Jira webhook → generate queue → AI drafts → dashboard review → dispatch queue → channel connectors.
