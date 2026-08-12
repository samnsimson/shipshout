# GitHub Trigger Events Design

**Date:** 2026-08-12  
**Status:** Approved for planning  
**Apps:** `shipshout-api-svc`, `shipshout-client-dashboard`  
**Libraries:** `@shipshout/database`, `@shipshout/api-client`  
**Design system:** [`DESIGN.md`](../../../DESIGN.md)  
**Product reference:** [`shipshout-project-explainer.md`](../../../shipshout-project-explainer.md)  
**Package manager:** bun

## Goal

Enable users to configure GitHub trigger events per linked repository, automatically register webhooks (with manual fallback), ingest incoming events, and create placeholder shoutout drafts. This is the automation foundation for ShipShout's dev-to-marketing pipeline — AI generation and multi-channel publishing come later.

## Decisions

| Topic | Choice |
| --- | --- |
| Trigger config | Per linked repo; multiple trigger types can be enabled simultaneously |
| Trigger types (v1) | Release published, git tag push, push to default branch |
| On trigger fire | Ingest event + create placeholder shoutout draft (`pending_ai`) |
| Webhook setup | Auto-register via GitHub API; manual fallback on failure |
| UI | Per-repo detail page at `/dashboard/repositories/[id]` |
| Default on link | No triggers enabled; user opts in on detail page |
| Architecture | Approach 2 — separate `TriggerModule`, `WebhookModule`, `ShoutoutModule` |
| Plan limits | Lightweight: log event but skip shoutout when `releasesPerMonth` exceeded |

## Architecture

```
User links repo (existing RepositoryModule)
        │
        ▼
Opens /dashboard/repositories/[id]
        │
        ▼
Enables trigger toggles → PATCH /repositories/:id/triggers
        │
        ▼
TriggerService registers/updates GitHub repo webhook
  events: [release, create, push]
  url: {API_BASE_URL}/webhooks/github/{deliveryToken}
        │
        ├─ success → webhook status: active
        └─ failure → webhook status: manual_required (+ URL/secret in UI)
        │
        ▼
GitHub fires event → POST /webhooks/github/:deliveryToken
        │
        ▼
WebhookIngestService: verify signature → match linked repo
        │
        ▼
TriggerEventUtils: filter by enabled trigger types
  • release + action=published
  • create + ref_type=tag
  • push + ref=refs/heads/{defaultBranch}
        │
        ▼
Create trigger_event (audit log) + shoutout draft (status: pending_ai)
        │
        ▼
Visible on repo detail (recent events) + /dashboard/shoutouts list
```

### Module layout (`shipshout-api-svc`)

```
apps/shipshout-api-svc/src/app/
├── repository/          (unchanged — OAuth + link/unlink; extended lifecycle hooks)
├── trigger/
│   ├── trigger.module.ts
│   ├── controllers/trigger.controller.ts
│   ├── services/trigger.service.ts
│   ├── services/github-webhook.service.ts
│   └── repositories/...
├── webhook/
│   ├── webhook.module.ts
│   ├── controllers/github-webhook.controller.ts   # @AllowAnonymous
│   └── services/webhook-ingest.service.ts
└── shoutout/
    ├── shoutout.module.ts
    ├── controllers/shoutout.controller.ts
    ├── services/shoutout.service.ts
    └── repositories/...
```

Static utility classes (per repo conventions):

- `TriggerEventUtils` — event type matching against enabled toggles
- `WebhookSignatureUtils` — HMAC-SHA256 verification
- `ShoutoutTitleUtils` — derive placeholder title from payload

## Database schema

### `repository_triggers`

One row per linked repository (seeded on link with all-false defaults).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `linkedRepositoryId` | uuid | FK → `linked_repositories`, unique |
| `release` | boolean | Release published |
| `tagPush` | boolean | Git tag push (`create` event) |
| `branchPush` | boolean | Push to default branch |
| `updatedAt` | timestamptz | |

### `repository_webhooks`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `linkedRepositoryId` | uuid | FK, unique |
| `deliveryToken` | varchar | Public token in webhook URL path |
| `secretEncrypted` | text | HMAC secret (encrypted at rest) |
| `githubHookId` | bigint | nullable until registered |
| `status` | enum | `pending`, `active`, `manual_required`, `error` |
| `lastDeliveryAt` | timestamptz | nullable |
| `lastError` | text | nullable |
| `createdAt` | timestamptz | |
| `updatedAt` | timestamptz | |

### `trigger_events`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `linkedRepositoryId` | uuid | FK |
| `userId` | varchar | Denormalized for queries |
| `githubDeliveryId` | varchar | Unique — dedupe replays |
| `eventType` | varchar | `release`, `create`, `push` |
| `triggerType` | enum | `release`, `tag_push`, `branch_push` |
| `summary` | varchar | Human-readable one-liner |
| `payload` | jsonb | Raw GitHub payload |
| `status` | enum | `processed`, `ignored`, `limit_exceeded` |
| `shoutoutId` | uuid | nullable FK |
| `createdAt` | timestamptz | |

### `shoutouts`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `userId` | varchar | Owner |
| `linkedRepositoryId` | uuid | FK |
| `triggerEventId` | uuid | FK, unique |
| `title` | varchar | Auto-derived placeholder |
| `status` | enum | `pending_ai` (v1 only value) |
| `sourceSummary` | jsonb | Payload excerpt for detail view |
| `createdAt` | timestamptz | |

## API endpoints

### Protected (JWT)

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/repositories/:id` | Repo detail + triggers + webhook status |
| `GET` | `/repositories/:id/triggers` | Trigger toggles + webhook status |
| `PATCH` | `/repositories/:id/triggers` | Update toggles → sync GitHub webhook |
| `GET` | `/repositories/:id/events` | Recent trigger events (`?limit=20&cursor=`) |
| `GET` | `/shoutouts` | List user's shoutout drafts |
| `GET` | `/shoutouts/:id` | Single shoutout detail |

#### `PATCH /repositories/:id/triggers` body

```json
{
  "release": true,
  "tagPush": false,
  "branchPush": true
}
```

#### Response (triggers + webhook)

```json
{
  "triggers": { "release": true, "tagPush": false, "branchPush": true },
  "webhook": {
    "status": "active",
    "lastDeliveryAt": "2026-08-12T10:00:00Z",
    "manualSetup": null
  }
}
```

When `status` is `manual_required`, `manualSetup` includes:

```json
{
  "url": "https://api.example.com/webhooks/github/{deliveryToken}",
  "secret": "{plaintext-secret-for-copy}",
  "instructions": "Add this webhook in GitHub → Settings → Webhooks"
}
```

### Public (anonymous)

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/webhooks/github/:deliveryToken` | Receive GitHub webhook deliveries |

Returns `200` on success, ignored events, and dedupe replays. Returns `401` on bad signature, `404` on unknown token.

## GitHub webhook registration

Extend GitHub API integration with webhook CRUD (via user's repo OAuth token):

- `createRepoWebhook(accessToken, owner, repo, config)`
- `updateRepoWebhook(accessToken, owner, repo, hookId, config)`
- `deleteRepoWebhook(accessToken, owner, repo, hookId)`

Webhook config sent to GitHub:

```json
{
  "name": "web",
  "active": true,
  "events": ["release", "create", "push"],
  "config": {
    "url": "{API_BASE_URL}/webhooks/github/{deliveryToken}",
    "content_type": "json",
    "secret": "{generatedSecret}",
    "insecure_ssl": "0"
  }
}
```

**Strategy:** One webhook per linked repo. Subscribe to all three event types; filter server-side based on enabled toggles. When all toggles are off, delete the GitHub webhook and clear `repository_webhooks`.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `API_BASE_URL` | Base URL for webhook callback (may reuse existing public API URL env) |
| `WEBHOOK_SECRET_ENCRYPTION_KEY` | Encrypt webhook secrets at rest |

## Event filtering

| GitHub event | Condition | Trigger type |
| --- | --- | --- |
| `release` | `action === "published"` | `release` |
| `create` | `ref_type === "tag"` | `tag_push` |
| `push` | `ref === refs/heads/{defaultBranch}` | `branch_push` |

### Ignored scenarios (return `200`, status `ignored`)

- Push to non-default branch
- Push with zero commits
- Release `draft`, `prereleased`, or `deleted`
- Event type enabled on GitHub webhook but toggle off in ShipShout
- Tag/branch push when only release toggle is on (and vice versa)

## Lifecycle hooks

Extend existing `RepositoryService` flows:

| Event | Action |
| --- | --- |
| **Link repo** | Seed `repository_triggers` (all false); no webhook |
| **Unlink repo** | Delete GitHub webhook (best-effort), cascade triggers/webhook/events/shoutouts |
| **Disconnect GitHub** | Same cleanup for all user's linked repos |

## Plan limits

On shoutout creation, check user's active subscription `limits.releasesPerMonth`:

- Within limit → create shoutout, event status `processed`
- Over limit → skip shoutout, event status `limit_exceeded`
- `null` limit (Pro) → unlimited

Count shoutouts created in the current billing month (calendar month for v1 simplicity).

## Dashboard UI

### New routes

| Route | Purpose |
| --- | --- |
| `/dashboard/repositories/[id]` | Trigger config, webhook status, recent events |
| `/dashboard/shoutouts` | List placeholder drafts (replaces stub) |
| `/dashboard/shoutouts/[id]` | Shoutout detail (minimal v1) |

### Repositories list changes

- Add "Configure" link per linked repo row → detail page
- Badge: `{n} active` triggers or `No triggers`

### Repo detail page layout

Three `feature-card` panels per `DESIGN.md`:

1. **Header** — repo full name, GitHub link, back nav, default branch badge
2. **Trigger configuration** — three toggles + save button; helper text about opt-in defaults
3. **Webhook status** — status badge; manual setup panel with copyable URL/secret when needed
4. **Recent events** — table with type, summary, timestamp, shoutout link or "Limit reached"

Client component: `RepositoryDetailClient` with save via server action (`src/lib/triggers/actions.ts`).

### Shoutouts page

**List:** title, repo, trigger type badge, `Pending AI` status, created date.

**Detail:** title, trigger type, timestamp, collapsible source summary, link to repo detail.

### New lib modules

```
src/lib/triggers/api.ts
src/lib/triggers/actions.ts
src/lib/shoutouts/api.ts
```

Follow existing `ApiClient` + cookie forwarding pattern from `src/lib/repositories/api.ts`.

## Error handling

### Webhook security

- Verify `X-Hub-Signature-256` on every delivery
- Dedupe on `X-GitHub-Delivery` (unique index)
- Idempotent: replay returns `200` without duplicate shoutout

### Registration failures

| Failure | UI status | Behavior |
| --- | --- | --- |
| 403 insufficient permissions | `manual_required` | Show manual setup panel |
| 404 repo inaccessible | `error` | "Lost access to repo" |
| 422 hook exists (same URL) | — | Update existing hook |
| Network/5xx | `error` | Retry via re-save triggers |

## Shoutout title generation

`ShoutoutTitleUtils.deriveTitle(event)`:

- Release → `"Release {tag_name} — {fullName}"`
- Tag → `"Tag {ref} — {fullName}"`
- Branch push → `"Push to {branch} — {fullName}"` (latest commit message as subtitle in detail view)

## Testing

### Unit tests

- `WebhookSignatureUtils.verify` — valid/invalid/missing
- `TriggerEventUtils.matchesEnabledTrigger` — all types + edge cases
- `ShoutoutTitleUtils.deriveTitle` — release/tag/push payloads

### Integration tests (mocked GitHub)

- `PATCH /repositories/:id/triggers` — toggle on registers; all off deletes
- `POST /webhooks/github/:token` — valid delivery creates event + shoutout
- Dedupe delivery ID → no duplicate shoutout
- Plan limit exceeded → event logged, no shoutout

### Manual test plan

1. Link repo → detail page shows toggles off, status "Not configured"
2. Enable release trigger → status "Active"
3. Publish GitHub release → event + shoutout appear
4. Simulate register failure → manual setup panel with copyable URL/secret

## Out of scope (v1)

- AI content generation
- Multi-channel draft editing / publishing
- Linear / Jira triggers
- GitHub App migration
- Workspace/team multi-user
- Real-time push notifications / email alerts
- Full billing enforcement UI beyond limit-exceeded flag on events
