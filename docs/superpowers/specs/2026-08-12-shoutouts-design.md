# Shoutouts Pipeline Design

**Date:** 2026-08-12  
**Status:** Approved for planning  
**Apps:** `shipshout-api-svc`, `shipshout-client-dashboard`  
**Libraries:** `@shipshout/database`, `@shipshout/api-client`, `@shipshout/email-client`  
**Design system:** [`DESIGN.md`](../../../DESIGN.md)  
**Product reference:** [`shipshout-project-explainer.md`](../../../shipshout-project-explainer.md)  
**Builds on:** [`2026-08-12-github-trigger-events-design.md`](2026-08-12-github-trigger-events-design.md)  
**Package manager:** bun

## Goal

Complete the shoutouts pipeline: async AI generation of per-channel marketing variants, human review/edit in the dashboard, and dispatch through a pluggable channel system. v1 implements email only (draft-ready alert on generation + external newsletter on publish). X and LinkedIn appear in the channel catalog and UI as plan-gated stubs for future work.

## Decisions

| Topic | Choice |
| --- | --- |
| Scope | Full pipeline (generate → review → publish); email functional in v1 |
| Email behavior | Alert account owner when draft ready **and** send edited copy to configured recipients on publish |
| Content model | Per-channel AI variants (separate title/body per channel) |
| Channel config | Per linked repository (enable + JSON config + tone per repo) |
| Plan gating | `limits.channels: string[]` on `subscription_plans` rows |
| AI | Provider-agnostic `AiModule`; OpenAI default (`AI_PROVIDER=openai`, `OPENAI_API_KEY`) |
| Async jobs | Redis + `@nestjs/bullmq` (not raw BullMQ) |
| Live UI | SSE on detail page (Redis pub/sub); polling fallback on list + detail |
| Stub channel module | Replace existing Nest scaffold at `apps/shipshout-api-svc/src/app/channels/` |

## Architecture

```
GitHub webhook (existing WebhookIngestService)
        │
        ▼
Create shoutout (status: generating)
        │
        ▼
ShoutoutQueueService.addGenerationJob({ shoutoutId })
        │
        ▼
Return 200 to GitHub immediately
        │
        ▼
BullMQ queue: shoutout-generation
        │
        ▼
ShoutoutGenerationProcessor
  • load repository_channels for linked repo
  • intersect with user plan limits.channels
  • AiGenerationService.generateVariants(sourceSummary, channels, tone)
  • persist shoutout_channel_drafts (one row per entitled enabled channel)
  • send email_alert if channel enabled + entitled
  • shoutout status → ready_for_review
  • publish Redis event on shoutout:{id}:events
        │
        ▼
User opens /dashboard/shoutouts/[id]
  • SSE GET /shoutouts/:id/events OR poll GET /shoutouts/:id
  • edit drafts per channel tab
  • POST /shoutouts/:id/publish
        │
        ▼
shoutout status → publishing
ShoutoutQueueService.addDispatchJob({ shoutoutId })
        │
        ▼
BullMQ queue: shoutout-dispatch
        │
        ▼
ShoutoutDispatchProcessor
  • for each enabled publish channel (email_newsletter in v1):
      send via EmailClient, log result
  • status → published | partially_published | failed
  • publish Redis event
```

### Module layout (`shipshout-api-svc`)

```
apps/shipshout-api-svc/src/app/
├── channels/                    (replace Nest scaffold)
│   ├── channel.module.ts
│   ├── controllers/channel.controller.ts
│   ├── services/channel-catalog.service.ts
│   ├── services/repository-channel.service.ts
│   ├── repositories/...
│   └── utils/channel-entitlement.utils.ts
├── ai/
│   ├── ai.module.ts
│   ├── providers/ai-provider.interface.ts
│   ├── providers/openai.provider.ts
│   └── services/ai-generation.service.ts
├── shoutout/                    (extend existing)
│   ├── shoutout.module.ts       (+ BullModule.registerQueue)
│   ├── controllers/shoutout.controller.ts   (+ SSE, drafts, publish)
│   ├── services/shoutout.service.ts
│   ├── services/shoutout-queue.service.ts
│   ├── processors/shoutout-generation.processor.ts
│   ├── processors/shoutout-dispatch.processor.ts
│   ├── services/shoutout-events.service.ts    (Redis pub/sub for SSE)
│   └── repositories/...
└── webhook/                     (extend ingest to enqueue job)
```

Static utility classes (per repo conventions):

- `ChannelEntitlementUtils` — intersect repo channels with plan `limits.channels`
- `ChannelConfigUtils` — validate config JSON against channel schema
- `ShoutoutStatusUtils` — valid status transitions
- `AiPromptUtils` — build per-channel prompts from source summary + tone

### BullMQ setup

```typescript
// AppModule
BullModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
        connection: { url: config.getOrThrow('REDIS_URL') },
    }),
});

// ShoutoutModule
BullModule.registerQueue({ name: 'shoutout-generation' }, { name: 'shoutout-dispatch' });
```

- Processors: `@Processor('shoutout-generation')` + `@Process()`; same for dispatch
- Job payload: `{ shoutoutId: string }`
- Retries: 3 attempts, exponential backoff (BullMQ defaults)
- Idempotency: processor skips if shoutout already at terminal state for that job type

### Live updates (SSE + polling)

| Mechanism | Endpoint | When |
| --- | --- | --- |
| SSE | `GET /shoutouts/:id/events` | Detail page — subscribes to Redis channel `shoutout:{id}:events` |
| Polling | `GET /shoutouts/:id` | List page + SSE fallback — poll every 3s while status is `generating` or `publishing` |

Event payload: `{ status: string; channelKey?: string; error?: string }`.

Postgres shoutout row is source of truth for reads; Redis pub/sub is notification only.

## Channel catalog

Seeded `channel_types` table:

| Key | Kind | v1 functional | Config schema |
| --- | --- | --- | --- |
| `email_alert` | notify | Yes | `{}` — recipient is account email |
| `email_newsletter` | publish | Yes | `{ recipients: string[]; subjectPrefix?: string }` |
| `x` | publish | Stub UI only | `{}` |
| `linkedin` | publish | Stub UI only | `{}` |

**Kind semantics:**

- **notify** — fires automatically after generation completes (no user action)
- **publish** — fires when user clicks Publish on shoutout detail

### Per-repository config (`repository_channels`)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `linkedRepositoryId` | uuid | FK → linked repositories |
| `channelKey` | varchar | FK → channel_types.key |
| `enabled` | boolean | default false |
| `tone` | varchar | `professional` \| `dev_focused` \| `hype`; default `professional` |
| `config` | jsonb | validated against channel schema |
| `createdAt` / `updatedAt` | timestamptz | |

Unique index on `(linked_repository_id, channel_key)`.

Rows seeded on repo link with all channels disabled and default tone.

### Plan limits extension

Extend `SubscriptionPlanLimits`:

```typescript
type SubscriptionPlanLimits = {
    repos: number;
    releasesPerMonth: number | null;
    channels: string[];
};
```

Seed values:

| Plan | channels |
| --- | --- |
| free | `[]` |
| starter | `['email_alert']` |
| pro | `['email_alert', 'email_newsletter']` |

Future growth plan adds `x`, `linkedin` when shipped.

**Entitlement rules:**

- Enable channel: user's active plan `limits.channels` must include `channelKey`
- UI shows locked channels with upgrade CTA when plan lacks entitlement
- On plan downgrade: existing enabled channels beyond entitlement remain enabled but new enables blocked; publish/dispatch skips disallowed channels with clear error in dispatch log

## Database schema (new / changed)

### `channel_types`

| Column | Type | Notes |
| --- | --- | --- |
| `key` | varchar | PK — e.g. `email_alert` |
| `displayName` | varchar | UI label |
| `description` | text | Short help text |
| `kind` | varchar | `notify` \| `publish` |
| `configSchema` | jsonb | JSON Schema for `repository_channels.config` |
| `sortOrder` | int | Display order |
| `isActive` | boolean | Hide from catalog when false |

### `shoutout_channel_drafts`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `shoutoutId` | uuid | FK |
| `channelKey` | varchar | FK → channel_types |
| `title` | varchar(512) | |
| `body` | text | Plain text or HTML for email |
| `editedAt` | timestamptz | nullable; set on user PATCH |
| `createdAt` | timestamptz | |

Unique index on `(shoutout_id, channel_key)`.

### `shoutout_dispatch_logs`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `shoutoutId` | uuid | FK |
| `channelKey` | varchar | |
| `status` | varchar | `sent` \| `failed` \| `skipped` |
| `error` | text | nullable |
| `sentAt` | timestamptz | nullable |
| `createdAt` | timestamptz | |

### `shoutouts` (changes)

| Change | Notes |
| --- | --- |
| `status` enum | Replace `pending_ai` with full lifecycle (see below) |
| Migration | `UPDATE shoutouts SET status = 'generating' WHERE status = 'pending_ai'` |

**Shoutout status enum:**

`generating` → `ready_for_review` → `publishing` → `published` | `partially_published` | `failed` | `generation_failed`

| Status | Meaning |
| --- | --- |
| `generating` | Job queued or in progress |
| `ready_for_review` | Drafts saved; user can edit and publish |
| `publishing` | Dispatch job in progress |
| `published` | All enabled publish channels succeeded |
| `partially_published` | Some publish channels failed |
| `failed` | All publish channels failed |
| `generation_failed` | AI job failed after retries; retry available |

## AI module

### Provider interface

```typescript
interface AiProvider {
    generateChannelVariants(input: {
        sourceSummary: Record<string, unknown>;
        channels: { key: string; tone: string }[];
        repoFullName: string;
    }): Promise<Record<string, { title: string; body: string }>>;
}
```

### OpenAI default

- Env: `OPENAI_API_KEY`, `AI_PROVIDER=openai` (default), `OPENAI_MODEL=gpt-4o` (default)
- `OpenAiProvider` implements `AiProvider`
- `AiProviderFactory` resolves provider by `AI_PROVIDER` env

### Prompt strategy

`AiPromptUtils` builds per-channel instructions:

- **email_alert** — not generated (notify uses link only); skip in variant generation
- **email_newsletter** — benefit-driven newsletter paragraph; HTML-friendly body
- **x** — ≤280 chars, punchy (generated for stub preview even if not dispatchable)
- **linkedin** — professional post, 1–3 short paragraphs

Tone modifiers: `professional`, `dev_focused`, `hype` applied per repo channel row.

Only generate variants for channels that are **enabled on repo** and **entitled by plan** at generation time.

## Email dispatch (v1)

Uses existing `@shipshout/email-client` (`RESEND_API_KEY`, `EMAIL_FROM`).

| Channel | Trigger | Recipient | Content |
| --- | --- | --- | --- |
| `email_alert` | After generation | Account owner email (from auth session user) | Subject: "Draft ready: {title}"; body: link to `/dashboard/shoutouts/{id}` |
| `email_newsletter` | On publish | `repository_channels.config.recipients[]` | Subject: `{subjectPrefix}{draft.title}`; body: user-edited draft HTML/text |

Dispatch processor writes `shoutout_dispatch_logs` per channel attempt.

## API endpoints

### Channels

| Method | Path | Auth | Behavior |
| --- | --- | --- | --- |
| GET | `/channels` | Yes | Catalog + `availableOnPlan` flags for current user |
| GET | `/repositories/:id/channels` | Yes | Per-repo config rows |
| PATCH | `/repositories/:id/channels` | Yes | Upsert enable/config/tone; validate entitlement + schema |

### Shoutouts (extend existing)

| Method | Path | Auth | Behavior |
| --- | --- | --- | --- |
| GET | `/shoutouts` | Yes | List (existing; include new statuses) |
| GET | `/shoutouts/:id` | Yes | Detail + drafts + dispatch logs |
| GET | `/shoutouts/:id/events` | Yes | SSE stream via Redis pub/sub |
| PATCH | `/shoutouts/:id/drafts/:channelKey` | Yes | Update title/body; set `editedAt` |
| POST | `/shoutouts/:id/publish` | Yes | Validate `ready_for_review`; enqueue dispatch job |
| POST | `/shoutouts/:id/retry-generation` | Yes | Re-enqueue if `generation_failed` |

OpenAPI decorators on all new/changed endpoints.

### Webhook ingest change

After creating shoutout with `status: generating`, call `ShoutoutQueueService.addGenerationJob({ shoutoutId })` instead of leaving at `pending_ai`.

## Dashboard UI

Follow [`DESIGN.md`](../../../DESIGN.md) tokens and existing dashboard patterns.

### Repository detail — Channels section

Location: `/dashboard/repositories/[id]`, below existing Triggers section.

- Card per channel type from catalog
- Toggle enable (disabled + upgrade CTA when plan lacks channel)
- Tone select when enabled
- Config form per channel (`recipients` for email_newsletter)
- Save → `PATCH /repositories/:id/channels`

### Shoutouts list

Location: `/dashboard/shoutouts` (replace placeholder copy).

- Status badges: Generating, Ready for review, Publishing, Published, Failed
- Poll list every 3s while any row is `generating` or `publishing`

### Shoutout detail

Location: `/dashboard/shoutouts/[id]`.

- Connect SSE on mount; fall back to polling if SSE errors
- Tabbed editor: one tab per channel with a draft (`email_newsletter`, `x`, `linkedin`, etc.)
- Read-only preview for notify channels (`email_alert` has no draft body)
- Publish button (enabled when `ready_for_review` and at least one publish channel enabled)
- Dispatch log table at bottom
- Retry generation button when `generation_failed`

### Stub channels (X, LinkedIn)

- Visible in repo channel config and shoutout detail tabs
- Disabled with "Available on {plan} plan" when not entitled
- Not included in any v1 plan seed; no drafts generated until a plan grants `x` / `linkedin`

## Configuration

Add to `.env.example`:

```
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=
AI_PROVIDER=openai
OPENAI_MODEL=gpt-4o
```

`REDIS_URL` already present; document as required for shoutout jobs.

## Error handling

| Scenario | Behavior |
| --- | --- |
| Generation job fails (exhausted retries) | status → `generation_failed`; no alert email; retry endpoint available |
| Partial publish failure | status → `partially_published`; per-channel errors in dispatch log |
| All publish channels fail | status → `failed` |
| Channel disabled between generation and publish | skip with `skipped` dispatch log entry |
| Plan lacks channel at publish time | skip with `skipped` + reason in log |
| Invalid newsletter recipients | fail that channel; others may succeed → `partially_published` |
| Redis unavailable at webhook time | still create shoutout; job enqueue fails → log error; manual retry endpoint |

## Testing

| Area | Tests |
| --- | --- |
| `ChannelEntitlementUtils` | plan ∩ repo channel logic |
| `ChannelConfigUtils` | schema validation |
| `ShoutoutGenerationProcessor` | mocked `AiProvider`; draft persistence; alert send |
| `ShoutoutDispatchProcessor` | mocked `EmailClient`; partial failure states |
| `ShoutoutQueueService` | enqueue idempotency |
| SSE controller | emits events when Redis message received (unit/integration) |
| API | PATCH channels rejects disallowed enable; publish state guards |

## Out of scope (v1)

- X and LinkedIn API integration (stubs only)
- Growth plan row / Stripe price for new channels
- Admin CRUD for channel catalog
- Per-user global tone defaults (tone is per-repo only)
- Webhook-triggered regeneration on edited source events
- Bull Board / queue admin UI

## Migration notes

1. Add new tables + alter `subscription_plans.limits` JSON (migration)
2. Seed `channel_types` and update plan seeds with `channels` arrays
3. Migrate `shoutouts.status`: `pending_ai` → `generating`; re-enqueue generation for in-flight rows optional (or leave as `generation_failed` with retry)
4. Replace stub `ChannelModule` with real implementation
5. Regenerate `@shipshout/api-client` from OpenAPI after API changes
