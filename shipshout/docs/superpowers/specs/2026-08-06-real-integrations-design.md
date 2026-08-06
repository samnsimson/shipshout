# Real Integrations Only — Design Spec

**Date:** 2026-08-06  
**Status:** Approved (design)  
**Supersedes:** Mock/simulate dev shortcuts from `2026-08-06-dogfood-ui-design.md`

---

## 1. Goal & Scope

Remove all simulation and mock shortcuts from ShipShout's product surface and backend worker paths. Users trigger drafts only via real GitHub release webhooks and publish only via real channel integrations (OAuth or workspace Resend API key).

### In scope

| Area | Change |
|---|---|
| Release ingestion | Remove `simulate-release` API and UI; GitHub webhooks only |
| Channel publishing | Remove `mock-connect`, `MockConnector`, `MOCK_CHANNELS`; real connectors always |
| Repositories UI | Webhook setup instructions + last release status per repo |
| Email channel | Workspace-level Resend API key connect (encrypted storage) |
| Connections UI | Single Connect action per channel; OAuth env availability hints |
| Env/docs | Document required OAuth credentials; remove `MOCK_CHANNELS` |

### Out of scope

- Linear/Jira source integrations (already real webhook paths)
- Tweet generator lead magnet (separate public tool)
- Building new OAuth apps — configure existing connector integrations only
- GitHub App webhook auto-provisioning (manual webhook setup instructions remain)
- Jest test doubles in unit tests (standard mocking, not product mocks)

### Decisions log

| Decision | Choice |
|---|---|
| Release triggering | Real GitHub releases only — delete simulate-release |
| Channel publishing | Real OAuth/API for all channels — no mocks |
| Repositories UI | Webhook setup + last release received timestamp/status |
| Email | Workspace-level Resend API key pasted in Connections, stored encrypted |
| Implementation approach | Big-bang removal with ordered tasks in one implementation plan |

---

## 2. Remove Simulation & Mock Infrastructure

### Delete entirely

**API (`apps/api`):**
- `webhooks/controllers/repository-simulate.controller.ts`
- `webhooks/dtos/simulate-release.dto.ts`
- `WebhooksService.simulateRelease()` method
- `connections/controllers/connections.controller.ts` — `mockConnect` handler
- Related unit tests for simulate/mock endpoints

**Worker (`apps/worker`):**
- `connectors/mock-connector.ts`
- `MOCK_CHANNELS` branching in `factories/connector-registry.factory.ts`
- Related mock connector tests

**Web (`apps/web`):**
- `lib/repositories.ts` — `simulateRelease()` export
- `lib/connections.ts` — `mockConnect()` export
- `repository-row.tsx` — "Send test release" collapsible and form
- `connection-row.tsx` — "Connect (test)" button
- Related lib spec tests for simulate/mock

**Config:**
- Remove `MOCK_CHANNELS` from `.env`, `.env.example`, README

### Keep unchanged (real paths)

- GitHub OAuth repo connect flow
- `POST /api/webhooks/github` signed webhook ingestion
- Channel OAuth: `GET .../connections/:channel/start` → callback → token storage
- Real connectors: `XConnector`, `LinkedInConnector`, `EmailConnector`, `BufferConnector`, `MailchimpConnector`
- `acceptEvent()` private method in `WebhooksService` (used by real webhooks)

### Worker connector registry

```typescript
export function buildConnectorRegistry(): ConnectorRegistry {
  return new ConnectorRegistry([
    new XConnector(),
    new LinkedInConnector(),
    new EmailConnector(),
    new BufferConnector(),
    new MailchimpConnector(),
  ]);
}
```

No environment flag. Always real.

---

## 3. Repositories UI — Webhook Setup + Last Release Status

### API: extend repository list response

**Endpoint:** `GET /api/workspaces/:workspaceId/repositories`

**Extended response shape per repo:**

```typescript
{
  id: string;
  provider: string;
  name: string;
  enabled: boolean;
  lastReleaseAt: string | null;       // ISO timestamp
  lastReleaseStatus: 'received' | 'generating' | 'drafted' | 'failed' | null;
}
```

**Implementation:** Subquery or join on `release_events` for `MAX(createdAt)` per repository. No schema migration required.

### UI: `RepositoryRow` collapsible

Replace "Send test release" trigger with **"Webhook & status"**.

**Panel contents:**
1. **Webhook URL** — `{API_BASE_URL}/api/webhooks/github`, copyable via `SecretReveal`
2. **Setup steps** — numbered instructions:
   - Open GitHub App / repo webhook settings
   - Set payload URL to the webhook URL above
   - Subscribe to `release` events
   - Paste the webhook secret shown at repo connect time
3. **Status:**
   - No events: *"Waiting for first release"* (muted text)
   - Has events: *"Last release received {relative time}"* + `StatusBadge` for event status

**Webhook secret for existing repos:** Secret was shown once at connect time. Panel notes: *"If you need the secret again, reconnect the repository."* Do not expose encrypted secret from API.

### Drafts empty state copy

Update from simulate-oriented text to: *"Publish a release on GitHub to generate drafts."*

---

## 4. Connections — Real OAuth + Email API Key

### Connections UI (`ConnectionRow`)

- Remove "Connect (test)" button
- One primary action per channel:

| Channel | Connect action |
|---|---|
| X | OAuth redirect via `connectUrl()` |
| LinkedIn | OAuth redirect |
| Buffer | OAuth redirect |
| Mailchimp | OAuth redirect |
| Email | Inline API key form (Resend) |

### Email connect (new)

**Endpoint:** `POST /api/workspaces/:workspaceId/connections/email/connect`

**Body:** `{ apiKey: string }`

**Flow:**
1. Validate key against Resend API (lightweight call — e.g. `GET https://api.resend.com/domains` with Bearer token)
2. On success: `saveTokens(workspaceId, Channel.Email, { accessToken: apiKey })`, status `active`
3. On failure: `400` with message *"Invalid Resend API key"*

**Disconnect (new):** `DELETE /api/workspaces/:workspaceId/connections/email` — removes connection record.

**Worker:** `EmailConnector.publish()` uses workspace `accessToken` from DB. Platform env `EMAIL_FROM` remains the sender address; remove any mock-token fallback paths.

### OAuth availability hints

**Endpoint:** `GET /api/workspaces/:workspaceId/connections/config`

**Response:**
```typescript
{
  x: boolean;
  linkedin: boolean;
  buffer: boolean;
  mailchimp: boolean;
  email: true;  // always available (user-provided key)
}
```

Booleans reflect whether `CLIENT_ID` and `CLIENT_SECRET` env vars are non-empty on the server. No secrets returned.

**UI:** Disable OAuth Connect button when channel config is `false`. Show helper text: *"{Channel} OAuth is not configured on this server."*

### Required environment variables (`.env.example`)

```
X_CLIENT_ID=
X_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
BUFFER_CLIENT_ID=
BUFFER_CLIENT_SECRET=
MAILCHIMP_CLIENT_ID=
MAILCHIMP_CLIENT_SECRET=
EMAIL_FROM=updates@yourdomain.com
```

Remove `MOCK_CHANNELS`.

---

## 5. Data Flow

### Release ingestion (only path)

```
GitHub: release published
  → POST /api/webhooks/github (HMAC signed)
  → WebhooksService.handleGithub
  → ingestNormalized (verify signature, match repo by externalId)
  → acceptEvent (dedupe, usage limit, enqueue)
  → BullMQ QUEUES.generate
  → Worker GenerateProcessor
  → GenerationService → drafts (X, LinkedIn, Email)
  → ReleaseEvent status: drafted
```

### Publish flow

```
User: approve draft → publish
  → POST .../drafts/:id/publish
  → BullMQ QUEUES.dispatch
  → Worker DispatchProcessor
  → DispatchService → real ChannelConnector
  → PublishRecord + draft status updated
```

---

## 6. Error Handling

| Scenario | User-facing behavior |
|---|---|
| OAuth env vars missing on server | Connect button disabled; config hint shown |
| Invalid Resend API key on save | Inline error; connection not created |
| Webhook signature mismatch | GitHub receives `{ accepted: false }`; no UI change |
| Publish with no channel connection | Error: *"Connect {channel} in Settings first."* |
| Publish with expired OAuth token | Draft status `failed`; user prompted to reconnect |
| No GitHub releases received yet | Repo row: *"Waiting for first release"* |
| Worker not running | Drafts page polling times out (existing behavior) |

---

## 7. Testing

### Unit/integration tests to update

- Remove: `simulateRelease` tests in `webhooks.service.spec.ts`, `repository-simulate.controller.spec.ts`
- Remove: `mockConnect` tests in `connections.controller.spec.ts`
- Remove: `mock-connector.spec.ts`, mock branch in `connector-registry.factory.spec.ts`
- Remove: `simulateRelease` / `mockConnect` tests in web lib specs

### New tests

- `RepositoriesService.list()` returns `lastReleaseAt` / `lastReleaseStatus` when events exist
- `POST .../connections/email/connect` validates key and stores encrypted token
- `POST .../connections/email/connect` rejects invalid key with 400
- `GET .../connections/config` reflects env var presence

### Manual dogfood checklist

1. Configure OAuth env vars for at least one channel (e.g. X)
2. Connect GitHub repo via OAuth
3. Configure GitHub webhook with URL + secret
4. Publish a real GitHub release → drafts appear within ~30s (worker running)
5. Connect X via OAuth Connect button
6. Approve and publish draft → verify real API call (or expected OAuth error if creds are test-only)
7. Connect Email with Resend API key → publish email draft

---

## 8. Implementation Order

1. Remove mock/simulate backend code + tests
2. Remove mock/simulate frontend code + tests
3. Worker: always real connectors; remove `MOCK_CHANNELS`
4. API: repository list with last release fields
5. API: email connect + disconnect + connections config endpoint
6. Web: repository row webhook/status UI
7. Web: connection row real-only + email key form + OAuth disabled states
8. Update `.env.example`, README, drafts empty state copy

---

## 9. Reference: Files to Touch

| File | Action |
|---|---|
| `apps/api/.../repository-simulate.controller.ts` | Delete |
| `apps/api/.../simulate-release.dto.ts` | Delete |
| `apps/api/.../webhooks.service.ts` | Remove `simulateRelease` |
| `apps/api/.../connections.controller.ts` | Remove `mockConnect`; add email connect/disconnect |
| `apps/api/.../connections.service.ts` | Add email validate + config helper |
| `apps/api/.../repositories.service.ts` | Add last release fields to list |
| `apps/worker/.../mock-connector.ts` | Delete |
| `apps/worker/.../connector-registry.factory.ts` | Simplify |
| `apps/web/.../repository-row.tsx` | Webhook/status UI |
| `apps/web/.../connection-row.tsx` | Real connect only + email form |
| `apps/web/src/lib/repositories.ts` | Remove `simulateRelease` |
| `apps/web/src/lib/connections.ts` | Remove `mockConnect`; add email connect |
| `.env.example`, `README.md` | Update |
