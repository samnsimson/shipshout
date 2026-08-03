# ShipShout — Full-Stack SaaS Design Spec

**Date:** 2026-08-03
**Status:** Approved (design), pending implementation plan
**Source idea:** `shipshout-project-explainer.md`

> ShipShout is an automated dev-to-marketing engine for B2B SaaS: it transforms
> technical release notes and commit logs into channel-optimized, benefit-driven
> marketing content automatically.

---

## 1. Goal & Scope

Build the **full ShipShout product** described in the explainer as a single
full-stack SaaS application.

**In scope:**

- GitHub / Linear / Jira release-event ingestion via webhooks
- AI translation engine (technical artifacts → per-channel marketing copy)
- Human-in-the-loop review dashboard (preview, edit, approve, publish)
- Multi-channel dispatch: X (Twitter), LinkedIn, Email, plus Buffer/Mailchimp sync
- GitHub OAuth SSO with workspace/team multi-tenancy
- Stripe subscription billing with tiered limits (Starter / Pro / Growth)
- Public, unauthenticated lead-magnet tool ("Release Notes → Tweet Generator")

**Explicitly deferred / out of scope for v1:** in-app widget embedding, analytics
dashboards, per-workspace choice of AI provider UI (engine supports it internally
but no user-facing toggle initially).

## 2. Tech Stack

| Concern            | Choice                                             |
| :----------------- | :------------------------------------------------- |
| Monorepo           | Nx                                                 |
| Frontend           | Next.js (App Router)                               |
| Backend API        | NestJS (HTTP)                                       |
| Async workers      | NestJS + BullMQ (Redis)                            |
| ORM                | TypeORM                                            |
| Database           | PostgreSQL                                         |
| Queue/cache        | Redis                                              |
| AI                 | OpenAI (default) + Anthropic Claude (fallback)     |
| Email              | Resend or SendGrid                                 |
| Billing            | Stripe                                             |
| Packaging          | Docker (per app) + docker-compose (local)          |
| Validation         | zod (shared DTO/contract schemas)                  |

## 3. Architecture

### 3.1 Service Topology (Option A — modular monolith API + separate worker)

Three deployables from one Nx monorepo, backed by one Postgres and one Redis:

- **`web`** (Next.js): authenticated dashboard + public lead-magnet page.
  Talks to `api` over REST; uses server components/route handlers for SSR and
  session handling.
- **`api`** (NestJS HTTP): auth, workspaces, repositories, drafts CRUD, webhook
  receiver, billing, integration OAuth callbacks. Enqueues jobs to Redis.
- **`worker`** (NestJS, shared modules/DI, no HTTP server): BullMQ consumers for
  AI generation and channel dispatch, with retries and backoff.

`api` and `worker` share NestJS modules and the same DB schema via shared libs,
but run as independent processes so the worker (the AI/dispatch-heavy path) can
scale separately from request handling.

### 3.2 End-to-End Data Flow

```
GitHub / Linear / Jira event
        │  (signed webhook)
        ▼
[api] webhook receiver ──> validate signature + dedupe ──> persist ReleaseEvent
        │
        └── enqueue "generate" job (Redis / BullMQ)
                        │
                        ▼
[worker] generate consumer
        load BrandProfile + enabled channels
        build per-channel prompts
        call AI provider (OpenAI → Claude fallback)
        write Draft(s) [status: pending_review]
        notify (email / in-app)
                        │
                        ▼
[web] review dashboard ── user edits / approves ── publish
        │
        └── enqueue "dispatch" job
                        │
                        ▼
[worker] dispatch consumer ──> channel connector (X / LinkedIn / Email / Buffer / Mailchimp)
        write PublishRecord [status + externalUrl / error]  (retry on transient failure)
```

## 4. Nx Monorepo Layout

```
apps/
  web/                    # Next.js (dashboard + public lead magnet)
  api/                    # NestJS HTTP
  worker/                 # NestJS BullMQ consumer (no HTTP)
  api-e2e/
  web-e2e/
libs/
  shared/contracts/       # DTOs, zod schemas, shared types (web + api + worker)
  shared/util/            # cross-cutting helpers
  core/domain/            # pure domain logic (tone, prompt building, tier limits)
  data/entities/          # TypeORM entities, migrations, data-source
  data/repositories/      # repository/query abstractions
  ai/                     # AiProvider abstraction (OpenAI default, Claude fallback)
  integrations/
    github/  linear/  jira/          # sources
    x/  linkedin/  email/            # direct publish targets
    buffer/  mailchimp/              # sync connectors
  billing/                # Stripe integration + plan/limit mapping
  auth/                   # GitHub OAuth, sessions, workspace guards
  queue/                  # BullMQ setup + typed job contracts
```

**Design principle:** each lib has one clear purpose, a well-defined interface,
and can be understood/tested independently. `core/domain` and prompt building are
kept pure (no network) so they are fully unit-testable.

## 5. Data Model

Core entities (TypeORM):

| Entity                | Key fields                                                                                       |
| :-------------------- | :---------------------------------------------------------------------------------------------- |
| **User**              | id, githubId, email, name, avatarUrl                                                            |
| **Workspace**         | id, name, slug, stripeCustomerId, plan                                                          |
| **Membership**        | user ↔ workspace, role (owner / admin / member)                                                 |
| **Repository**        | workspace, provider (github/linear/jira), externalId, name, webhookSecret, enabled             |
| **BrandProfile**      | workspace, tone (dev-focused / professional / hype-startup), customInstructions, emojiPolicy    |
| **ChannelConnection** | workspace, type (x/linkedin/email/buffer/mailchimp), encrypted OAuth tokens, status            |
| **ReleaseEvent**      | repository, source, rawPayload, commitSummary, status, deliveryId (dedupe)                      |
| **Draft**             | releaseEvent, channel, generatedCopy, editedCopy, status (pending_review/approved/published/failed), aiMeta |
| **PublishRecord**     | draft, channelConnection, externalUrl, status, error                                            |
| **Subscription**      | workspace, stripeSubId, tier, status, limits snapshot                                           |
| **UsageCounter**      | workspace, period, releasesProcessed (tier enforcement)                                         |

Secrets and OAuth tokens are **encrypted at rest** (AES-GCM via an app/KMS key).

## 6. AI Translation Engine (`libs/ai` + `libs/core/domain`)

- **Provider abstraction:** `AiProvider` interface (`generate(prompt, opts)`),
  implementations `OpenAiProvider` (default) and `ClaudeProvider` (fallback), with
  automatic failover on error/timeout. Per-workspace override supported internally.
- **Prompt building (pure):** composes system + user prompts from `BrandProfile`
  (tone enum, custom instructions, emoji policy) plus channel constraints
  (X char limit, LinkedIn format, email digest). No network → fully unit-testable.
- **Channel templates:** per-channel formatting rules and few-shot examples derived
  from the explainer's jargon-translation examples.
- **Guardrails:** token/cost caps per generation, per-channel output-length
  validation, retry with backoff, and structured logging of model/tokens/latency
  into `Draft.aiMeta`.

## 7. Integrations (`libs/integrations/*`)

Each connector implements a small common interface so channels are swappable.

- **Sources:** GitHub (Releases + webhook HMAC verification), Linear (sprint/issue
  completion), Jira (board webhooks).
- **Publish targets:** X (OAuth2 + tweet post), LinkedIn (OAuth2 + UGC post), Email
  (Resend/SendGrid).
- **Sync connectors:** Buffer, Mailchimp.
- OAuth tokens stored encrypted; per-connector token refresh.

## 8. Billing (`libs/billing`)

- Stripe Checkout for subscribe/upgrade; Customer Portal for self-serve management;
  Stripe webhooks keep `Subscription` + plan limits in sync.
- Tiers (from explainer) mapped to feature flags + limits:

| Tier        | Price      | Limits / features                                                              |
| :---------- | :--------- | :---------------------------------------------------------------------------- |
| **Starter** | $19 / mo   | 1 repository • 10 releases/mo • manual copy/paste output                       |
| **Pro**     | $49 / mo   | 3 repositories • unlimited releases • social API sync                          |
| **Growth**  | $149 / mo  | unlimited repositories • Jira/Linear integrations • email digests              |

- Enforcement via `UsageCounter` checked at ingestion time and repo-add time
  (guard rejects/queues over-limit actions).

## 9. Public Lead Magnet

- Unauthenticated `web` route: user pastes GitHub release notes or a repo URL →
  calls a **rate-limited** public API endpoint that reuses `libs/ai` → returns a
  tweet draft.
- IP-based rate limiting + abuse caps; strong CTA to sign up. No persistence of
  user data beyond ephemeral processing.

## 10. Security

- GitHub OAuth SSO; secure httpOnly session cookies; CSRF protection on mutations.
- Workspace-scoped authorization guards on every resource; role checks
  (owner / admin / member).
- Webhook signature verification (HMAC) per provider; dedupe by delivery id.
- Encrypted secrets/tokens at rest; input validation via zod DTOs in
  `shared/contracts`; secrets via env/secret manager.

## 11. Testing (standard depth)

- **Unit:** AI prompt builders, tone logic, tier-limit calculations, connector
  payload transforms.
- **Integration:** API + Postgres (test DB with migrations), webhook signature
  verification, Stripe billing webhook handling.
- **E2E:** auth/onboarding, add repo, simulate release → generate → review →
  publish (external APIs mocked), Stripe checkout (test mode).
- External APIs mocked in CI; test Postgres + Redis via docker-compose.

## 12. Deployment & Ops

- Dockerfile per app (`web`, `api`, `worker`); `docker-compose` for local dev
  (Postgres + Redis + all services). Cloud-agnostic target (Fly.io / Railway /
  Render) with managed Postgres + Redis.
- TypeORM migrations run on deploy; healthcheck endpoints; structured logging;
  error tracking (Sentry); environment-based configuration.

## 13. Build Order / Phasing (single spec, incremental delivery)

1. **Foundation:** Nx workspace, TypeORM entities + migrations, GitHub OAuth,
   workspaces/memberships.
2. **Ingestion:** GitHub webhook receiver → `ReleaseEvent`, BullMQ/Redis setup.
3. **AI engine + generation worker:** provider abstraction, prompt building,
   `Draft` creation.
4. **Review dashboard:** Next.js draft list, edit, approve.
5. **Dispatch:** X + LinkedIn + Email connectors, then Buffer/Mailchimp sync.
6. **Billing:** Stripe checkout/portal/webhooks + tier enforcement.
7. **Additional sources:** Linear + Jira.
8. **Public lead magnet:** rate-limited generator page.
9. **Hardening:** tests, observability, deployment pipeline.

## 14. Open Questions / Assumptions

- Email provider: Resend vs SendGrid — either acceptable; final pick at
  implementation time based on account availability.
- Cloud host: cloud-agnostic Docker; specific host chosen at deploy time.
- AI provider default assumed OpenAI; Claude used as fallback. No user-facing
  provider toggle in v1.
