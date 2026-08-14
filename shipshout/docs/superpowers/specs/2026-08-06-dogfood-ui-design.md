# Dogfood UI — Connect, Trigger, Publish — Design Spec

**Date:** 2026-08-06
**Status:** Approved (design), pending implementation plan
**Source idea:** manual E2E testing was curl-only; no UI existed to register a repo, trigger a release, or connect a publish channel

---

## 1. Goal & Scope

Let a logged-in user exercise the entire ShipShout pipeline from the browser —
create a workspace, register a repo, trigger a release, review/edit/approve a
draft, connect a publish channel, and publish it — without curl commands,
manual DB inserts, or real third-party API keys (X/LinkedIn/Buffer/Mailchimp).

**In scope:**

- Workspace creation UI (form + working workspace switcher)
- Repositories settings page: list, register, show webhook URL/secret once,
  "Send test release" action per repo
- Connections settings page: list channels, real OAuth "Connect" link, and a
  dev-only "Connect (test)" action that fakes a connection
- Backend: a simulate-release endpoint that reuses the existing webhook
  ingestion/dedupe/usage-limit logic
- Backend: a `MOCK_CHANNELS` mode that swaps real channel connectors for a
  connector that always succeeds, so publish can be verified end-to-end
  without real API credentials

**Explicitly out of scope:**

- Any change to the `Channel` enum, `Draft` schema, or the hardcoded
  generation channel list (`X`, `LinkedIn`, `Email`)
- Redesigning the visual style — new pages follow the existing plain
  inline-style convention used by `drafts`/`brand` pages
- Real GitHub App installation flow (repo registration stays the existing
  manual provider/name/externalId form)
- Changing how `externalId` matching works for real (non-simulated) webhooks

## 2. User-Facing Flow

1. Log in via GitHub → land on dashboard.
2. No workspace yet → fill in "Create workspace" form → redirected into it.
3. Go to **Settings → Repositories** → add a repo (provider, name,
   auto-filled externalId) → webhook secret + URL shown once.
4. Click **Send test release** on that repo → a release event is ingested and
   a "generate" job is queued immediately (no signed payload needed).
5. Go to **Drafts** → see generated drafts per channel, edit copy, Approve.
6. Go to **Settings → Connections** → click **Connect (test)** next to a
   channel (e.g. X) → connection becomes Active instantly.
7. Back on **Drafts**, click **Publish** on an approved draft for that
   channel → dispatch succeeds via the mock connector → a `PublishRecord`
   with `status: success` and a fake `externalUrl` is created.

## 3. Frontend Changes (`apps/web`)

### 3.1 Workspace creation

- `app/(dashboard)/page.tsx`: when the user has no workspaces, render a new
  client component `create-workspace-form.tsx` (name input + submit) that
  calls `createWorkspace(name)` and redirects to `/{id}/drafts` on success.
- `app/(dashboard)/layout.tsx`: the existing `<select aria-label="Workspace">`
  becomes a small client component `workspace-switcher.tsx` that, on change,
  always navigates to `/{selectedId}/drafts` (simplest correct behavior —
  switching workspaces mid-settings-page is rare enough that resetting to
  the drafts view is acceptable). It also gets a "+ New workspace" option
  that routes to `/`.

### 3.2 Repositories page

New route: `app/(dashboard)/[workspaceId]/settings/repositories/page.tsx`
(server component, fetches `listRepositories(workspaceId)`), plus two client
components:

- `repository-form.tsx`: provider select (`github` default / `linear` /
  `jira`), name text input, `externalId` input pre-filled with
  `crypto.randomUUID()`-style default (editable, with helper text: "Must
  match the id in the incoming payload. Leave as-is if you'll only use 'Send
  test release'."). On submit calls `createRepository(workspaceId, dto)`; on
  success shows a one-time callout with the returned `webhookSecret` and the
  webhook URL (`{NEXT_PUBLIC_API_BASE_URL}/api/webhooks/github`), then
  refreshes the list.
- `repository-row.tsx`: displays provider/name/enabled + a **Send test
  release** button. Clicking it opens a small inline expandable form
  (title + notes, both optional, sane defaults like `Test release
  {timestamp}` / `Testing the ShipShout pipeline.`) and calls
  `simulateRelease(workspaceId, repositoryId, { title, notes })`. Shows a
  success/error toast-style inline message (e.g. "Queued — check Drafts in a
  few seconds.").

### 3.3 Connections page

New route: `app/(dashboard)/[workspaceId]/settings/connections/page.tsx`
(server component, fetches `listConnections(workspaceId)`), plus
`connection-row.tsx` (client) rendered once per channel in
`[Channel.X, Channel.LinkedIn, Channel.Email, Channel.Buffer,
Channel.Mailchimp]`:

- Shows channel name + status badge (Connected / Not connected) based on
  whether that channel appears in the fetched connections list with
  `status: 'active'`.
- **Connect** — plain `<a href="{API_BASE}/api/workspaces/{ws}/connections/{channel}/start">`
  (existing OAuth redirect; works once real client id/secret are configured).
- **Connect (test)** — button that calls `mockConnect(workspaceId, channel)`;
  on success, refreshes the row to show Connected. On failure (e.g.
  `MOCK_CHANNELS` disabled server-side), shows the error inline.

### 3.4 Nav

`app/(dashboard)/layout.tsx` nav gains two links: `Repositories` and
`Connections`, alongside the existing Drafts/Brand/Billing.

### 3.5 New `apps/web/src/lib` modules

Following the existing `drafts.ts` / `brand.ts` pattern (thin wrappers over
`apiFetch`):

- `workspaces.ts` — `listWorkspaces()`, `createWorkspace(name)`
- `repositories.ts` — `listRepositories(ws)`, `createRepository(ws, dto)`,
  `simulateRelease(ws, repoId, { title?, notes? })`
- `connections.ts` — `listConnections(ws)`, `mockConnect(ws, channel)`

Each gets a matching `.spec.ts` following the existing
`drafts.spec.ts`/`brand.spec.ts` mocking style.

## 4. Backend Changes (`apps/api`)

### 4.1 Simulate-release endpoint

Added to `WebhooksModule` (not `RepositoriesModule`) to avoid a circular
dependency, since `WebhooksModule` already imports `RepositoriesModule`.

- New controller `RepositorySimulateController` in
  `apps/api/src/app/webhooks/`, `@Controller('workspaces/:workspaceId/repositories')`,
  guarded by `WorkspaceGuard`:
  - `POST :id/simulate-release` with body `{ title?: string; notes?: string }`
    (zod schema `SimulateReleaseSchema`, both fields optional strings, added
    to `libs/shared/contracts`).
- `WebhooksService` gets a new method `simulateRelease(workspaceId, repositoryId, dto)`:
  1. Loads the repo via `RepositoriesService` and verifies
     `repo.workspace.id === workspaceId` (404 otherwise).
  2. Builds `commitSummary` from `dto.title`/`dto.notes` (defaults: `Test
     release ${new Date().toISOString()}` / `Testing the ShipShout
     pipeline.`).
  3. Calls a new shared private method `acceptEvent(repo, { source,
     deliveryId, commitSummary, rawPayload, requireSourceIntegration })` —
     extracted from the existing `ingestNormalized` (the part after repo
     lookup: usage-limit check, dedupe check, save `ReleaseEvent`, enqueue
     `generate` job). `ingestNormalized` becomes a thin wrapper: look up repo
     by `externalId` + check `verified`, then delegate to `acceptEvent`.
  4. `deliveryId` is `sim-${randomUUID()}` (always unique, so no dedupe
     collisions across repeated test clicks); `source` is
     `SourceProvider.Github` regardless of the repo's actual provider,
     since simulate-release only needs to exercise generation, not
     provider-specific normalization; `requireSourceIntegration: false`.

This endpoint requires no signature, no `externalId` payload matching, and no
changes to the real webhook handlers (`handleGithub`/`handleLinear`/`handleJira`
are untouched aside from now calling `acceptEvent` internally).

### 4.2 Mock channel connections

- `ConnectionsController` gets `POST :channel/mock-connect`, guarded by
  `WorkspaceGuard`:
  - If `process.env.MOCK_CHANNELS !== 'true'`, throws `NotFoundException`
    (keeps prod behavior identical/absent).
  - Otherwise calls `ConnectionsService.saveTokens(workspaceId, channel, {
    accessToken: 'mock-token', externalAccountId: 'mock' })`.

### 4.3 `.env` / `.env.example`

Add `MOCK_CHANNELS=true` to both, documented as "local/dev only — swaps real
publish connectors for one that always succeeds, and enables the
'Connect (test)' UI action."

## 5. Backend Changes (`apps/worker`)

- New file `apps/worker/src/app/mock-connector.ts`: `MockConnector`
  implements `ChannelConnector`, constructed with a `Channel`, and
  `publish()` resolves immediately with
  `{ externalUrl: 'https://example.test/{channel}/{randomUUID}' }` — no
  network calls, always succeeds.
- `app.module.ts`: the `ConnectorRegistry` factory branches on
  `process.env.MOCK_CHANNELS === 'true'`:
  - `true` → `new ConnectorRegistry([Channel.X, Channel.LinkedIn,
    Channel.Email, Channel.Buffer, Channel.Mailchimp].map((c) => new
    MockConnector(c)))`
  - `false`/unset → existing real connectors (unchanged).

No changes to `DispatchService`, `Draft`, `ChannelConnection`, or the
hardcoded `[Channel.X, Channel.LinkedIn, Channel.Email]` generation list in
`generate.processor.ts`.

## 6. Data Flow Summary (simulate → publish)

```
[web] Repositories page → "Send test release"
        │ POST /workspaces/:ws/repositories/:id/simulate-release
        ▼
[api] RepositorySimulateController → WebhooksService.simulateRelease
        │ acceptEvent(): usage check, dedupe, save ReleaseEvent
        └── enqueue "generate" job (Redis / BullMQ)
                        ▼
[worker] generate consumer → GenerationService (unchanged)
        → Drafts (pending_review) visible on /[ws]/drafts

[web] Connections page → "Connect (test)"
        │ POST /workspaces/:ws/connections/:channel/mock-connect
        ▼
[api] ConnectionsController → ConnectionsService.saveTokens (status: active)

[web] Drafts page → Approve → Publish
        │ POST /workspaces/:ws/drafts/:id/publish (unchanged)
        ▼
[worker] dispatch consumer → ConnectorRegistry.get(channel) → MockConnector
        → PublishRecord(status: success, externalUrl: fake)
```

## 7. Error Handling

- Simulate-release on a repo from another workspace → 404 (existing
  `WorkspaceGuard` + explicit ownership check).
- Simulate-release when usage limits are exhausted → same `{ accepted:
  false }` shape as the real webhook path; UI shows an inline error.
- Mock-connect when `MOCK_CHANNELS` is off → 404; UI shows "Test connect is
  disabled in this environment," real "Connect" link remains available.
- Repository form / workspace form client-side validation mirrors the zod
  schemas already used server-side (non-empty name, etc.); server errors
  (400 with zod `flatten()`) are surfaced inline, matching the existing
  `BrandForm` error-handling pattern.

## 8. Testing

- New `.spec.ts` for each new `apps/web/src/lib` module (mock `apiFetch`,
  assert path/method/body), matching `drafts.spec.ts` style.
- `WebhooksService` spec: add cases for `simulateRelease` (happy path, wrong
  workspace → rejected, usage-limit exhausted → not accepted), and confirm
  existing `ingestNormalized`/`handleGithub` tests still pass unchanged
  after the `acceptEvent` extraction (pure refactor, no behavior change for
  the real webhook path).
- `ConnectionsController`/`ConnectionsService`: test `mock-connect` behind
  the `MOCK_CHANNELS` flag (on → saves active connection; off → 404).
- New `MockConnector` unit test: `publish()` resolves with a fake
  `externalUrl` and never throws.
- No changes needed to `apps/api-e2e/flow.e2e-spec.ts` (it already exercises
  the real signed-webhook path end-to-end); optionally leave as the
  "production-realistic" e2e test while the new UI covers the "dogfood"
  path manually.
