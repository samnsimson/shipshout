# Dashboard Home Page Design

**Date:** 2026-08-14  
**Status:** Approved for planning  
**App:** `shipshout-client-dashboard`  
**Design system:** [`DESIGN.md`](../../../DESIGN.md)  
**Related specs:** [`2026-08-11-client-dashboard-layout-design.md`](2026-08-11-client-dashboard-layout-design.md)  
**Package manager:** bun

## Goal

Fill the empty `/dashboard` home page with useful content that serves three roles at once:

1. **Onboarding hub** — guide new users through setup until the product is wired up.
2. **Status overview** — show key counts once setup is complete.
3. **Action hub** — surface items that need attention and recent shoutout activity.

## Background

The home page currently renders only a `PageHeader` welcome message. The layout spec originally envisioned a lightweight status snapshot (GitHub connected, linked repos count) but it was never implemented. Repositories, shoutouts, and channels pages now have real content; home should tie them together.

## Decisions

| Topic | Choice |
| --- | --- |
| Approach | Server-composed page using existing APIs (no new backend endpoint in v1) |
| Setup complete | All four gates must pass (see below) |
| When setup complete | Hide checklist entirely; show stats + action items + recent shoutouts |
| Home polling | None — user navigates to Shoutouts for in-flight refresh |
| Stat date range | Total shoutout count (no 30-day filter in v1) |
| Channels stat | Raw count of enabled generatable channels across repos (not deduped by key) |
| Webhook action items | Only `webhook.status === 'error'` (not `manual_required`) |

### Setup gates (all required)

| Gate | Pass condition |
| --- | --- |
| GitHub connected | `connection.connected === true` |
| Repo linked | `linkedRepos.length >= 1` |
| Trigger enabled | Any linked repo has `activeTriggerCount >= 1` |
| Publish channel enabled | Any linked repo has ≥1 **generatable** channel enabled |

**Generatable channel** mirrors backend `ChannelEntitlementUtils.filterGeneratable`:

```
enabled === true
AND channelKey ∈ subscription.limits.channels
AND channelKey !== 'email_alert'
```

## Approach

**Recommended:** Extend `dashboard/page.tsx` to fetch existing APIs in parallel, derive state in `DashboardHomeUtils`, pass props to a new `DashboardHomeClient`.

Alternatives considered:

1. **Dedicated `GET /dashboard/overview` endpoint** — single round trip and canonical logic, but more backend scope before validating home UX. Defer to v2 if N+1 fetches become a problem.
2. **Client-side fetch after shell render** — breaks the app's server-first data pattern; rejected.

## Page layout

Two mutually exclusive modes driven by `setupComplete`.

### Mode A — Onboarding (any gate failing)

```
┌─────────────────────────────────────────┐
│ PageHeader — Welcome back, {firstName}  │
│ "Finish setup to start shouting."       │
├─────────────────────────────────────────┤
│ Setup checklist (single card)           │
│  ☐ Connect GitHub          [Connect →]  │
│  ☐ Link a repository       [Repos →]    │
│  ☐ Enable a trigger        [Repos →]    │
│  ☐ Enable a publish channel [Channels →]│
│  (completed steps show ✓, muted)        │
└─────────────────────────────────────────┘
```

No stats, action items, or recent shoutouts in onboarding mode.

### Mode B — Ready (all gates pass)

```
┌─────────────────────────────────────────┐
│ PageHeader — Welcome back, {firstName}  │
│ "Your repos are wired up and shouting." │
├─────────────────────────────────────────┤
│ Stat tiles (SimpleGrid 2×2 → 4×1)       │
│  Linked repos │ Active triggers         │
│  Channels on  │ Shoutouts               │
├─────────────────────────────────────────┤
│ Needs attention (card, omit if empty)   │
│  • Draft ready to publish               │
│  • Generation/dispatch failed           │
│  • Webhook error on {repo}              │
├─────────────────────────────────────────┤
│ Recent shoutouts (table, max 5)         │
│  [View all →]                           │
└─────────────────────────────────────────┘
```

`PageHeader` stays in the server page (same pattern as other dashboard routes).

## Data fetching

### Server page (`dashboard/page.tsx`)

**Always fetched (both modes):**

| Call | Purpose |
| --- | --- |
| `getSession()` | Welcome header |
| `RepositoriesApi.getGithubConnection()` | Gate 1 |
| `RepositoriesApi.listLinkedRepos()` | Gate 2 + repo IDs |
| `BillingApi.getMySubscription()` | `limits.channels` for generatable check |

**Per linked repo (parallel `Promise.all`):**

| Call | Purpose |
| --- | --- |
| `TriggersApi.fetchRepositoryDetail(id)` | `activeTriggerCount`, `webhook.status` |
| `ChannelsApi.fetchRepositoryChannels(id)` | Enabled generatable channels |

**Ready mode only (`setupComplete`):**

| Call | Purpose |
| --- | --- |
| `ShoutoutsApi.fetchAll()` | Recent table, action items, shoutout stat |

Connect URL follows repositories page: `NEXT_PUBLIC_SHIPSHOUT_API_URL` + `/repositories/github/connect`.

### Error handling

- Required fetch failure → existing Next error boundary (same as other pages).
- Per-repo fetch failure for one repo → treat that repo as 0 triggers / 0 channels; do not block the page.
- Empty linked repos → skip per-repo fetches.

## `DashboardHomeUtils`

Location: `apps/shipshout-client-dashboard/src/lib/dashboard/dashboard-home.utils.ts`

Static methods only (per repo utility conventions).

### Types

```typescript
type SetupStep = 'github' | 'repo' | 'trigger' | 'channel';

type SetupState = {
  complete: boolean;
  steps: Record<SetupStep, { done: boolean; href: string; cta: string }>;
};

type DashboardStats = {
  linkedRepos: number;
  activeTriggers: number;
  channelsOn: number;
  shoutouts: number;
};

type ActionItem = {
  message: string;
  href: string;
  tone?: 'default' | 'danger';
};
```

### Checklist CTAs

| Step | Link | Button label |
| --- | --- | --- |
| GitHub | `connectUrl` (external) when not connected; else `/dashboard/repositories` | Connect GitHub / View repos |
| Repo | `/dashboard/repositories` | Link a repo |
| Trigger | `/dashboard/repositories/{firstLinkedId}` or `/dashboard/repositories` | Configure triggers |
| Channel | `/dashboard/channels?repo={firstLinkedId}` or `/dashboard/channels` | Enable a channel |

### Stats (ready mode)

| Tile | Value |
| --- | --- |
| Linked repos | `linkedRepos.length` |
| Active triggers | Sum of `activeTriggerCount` across repos |
| Channels on | Count of enabled generatable channels across all repos |
| Shoutouts | `shoutouts.length` |

### Action items (ready mode, max 5)

Priority order:

1. Webhook errors — `webhook.status === 'error'` → `/dashboard/repositories/{id}`
2. `generation_failed` → `/dashboard/shoutouts/{id}`
3. `failed` or `partially_published` → `/dashboard/shoutouts/{id}`
4. `ready_for_review` → `/dashboard/shoutouts/{id}`

Omit the entire card when the list is empty.

### Recent shoutouts

`shoutouts` sorted by `createdAt` descending, slice to 5.

## Components

### New files

```
apps/shipshout-client-dashboard/src/
├── app/(dashboard)/dashboard/page.tsx
├── components/dashboard/
│   ├── dashboard-home-client.tsx
│   ├── setup-checklist.tsx
│   ├── dashboard-stat-tiles.tsx
│   ├── dashboard-action-items.tsx
│   └── shoutouts-table.tsx          # extracted from ShoutoutsClient
└── lib/dashboard/
    └── dashboard-home.utils.ts
```

Also extend `ChannelsUtils` with `filterGeneratable(rows, planChannels)` mirroring backend rules.

### `SetupChecklist`

Card shell: `bg.surface`, hairline border, `borderRadius="lg"`, `p="lg"`.

- Eyebrow: **"Get started"**
- Progress: **"{n} of 4 complete"**
- Rows:
  - **Done:** `CheckCircle2` (green), muted title, no CTA
  - **Pending:** title `fontWeight="600"`, helper copy, `Button` (`borderRadius="full"`, `size="sm"`, `colorPalette="blue"`) or external link for GitHub

| Step | Title | Helper |
| --- | --- | --- |
| GitHub | Connect GitHub | Authorize Shipshout to read your repositories. |
| Repo | Link a repository | Choose which repos should trigger shoutouts. |
| Trigger | Enable a trigger | Turn on release, tag, or branch push events. |
| Channel | Enable a publish channel | Configure where shoutouts go when you publish. |

Visual pattern matches the disconnected-GitHub card on the repositories page.

### `DashboardStatTiles`

`SimpleGrid columns={{ base: 2, lg: 4 }} gap="md"`. Same card shell. Label uppercase muted; value `fontSize="2xl"`, `fontWeight="700"`. No icons in v1.

### `DashboardActionItems`

Rendered only when non-empty. Eyebrow **"Needs attention"**. Rows with message + "View →" link. Webhook errors use `red.fg`.

### `ShoutoutsTable`

Extract table markup from `ShoutoutsClient`:

```typescript
ShoutoutsTable({ shoutouts, emptyMessage? })
```

- `ShoutoutsClient` keeps polling via `router.refresh()`; delegates rendering to `ShoutoutsTable`.
- Home wraps with header **"Recent shoutouts"** + link to `/dashboard/shoutouts`.

### `DashboardHomeClient` props

```typescript
type DashboardHomeProps = {
  connectUrl: string;
  setup: SetupState;
  stats?: DashboardStats;
  actionItems?: ActionItem[];
  recentShoutouts?: ShoutoutDto[];
};
```

Presentational only — no client fetching.

## Empty states

| Scenario | Behavior |
| --- | --- |
| Onboarding | Checklist only |
| Ready + 0 shoutouts | Stat tiles visible; table shows empty message inside card |
| Ready + 0 action items | Action items card hidden |
| Per-repo fetch failed | Silent degradation for that repo |

## Non-goals (v1)

- Polling on home page
- Billing/plan upsell on home
- Activity feed beyond shoutouts
- New backend overview endpoint
- `manual_required` webhook in action items

## Testing

- Unit tests for `DashboardHomeUtils`: gate combinations, generatable filter, action item priority/cap, recent sort/slice
- Refactor `ShoutoutsClient` to use `ShoutoutsTable` without behavior change
- Manual smoke: fresh account (checklist), partial setup (mixed ✓/○), full setup (tiles + table + action items)

## Self-review

- [x] No placeholder sections — all decisions recorded
- [x] Consistent with `DESIGN.md` (quiet chrome, card shells, brand blue CTAs)
- [x] Matches existing server-first page patterns
- [x] Setup complete criteria align with user-approved brainstorming decisions
- [x] Generatable channel logic matches backend `ChannelEntitlementUtils.filterGeneratable`
- [x] Scope bounded — no new API endpoint, no polling, no billing upsell
