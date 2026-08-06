# Real Integrations Only — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all mock/simulate dev shortcuts and enforce real GitHub webhooks for draft generation and real OAuth/API credentials for channel publishing.

**Architecture:** Big-bang deletion of simulate-release and mock-connect paths across API, worker, and web. Extend repository list API with latest `release_events` metadata. Add Resend API-key connect and OAuth availability config endpoint. Update Settings UI to show webhook setup instructions and real-only connect flows.

**Tech Stack:** NestJS 11, TypeORM, BullMQ worker, Next.js 16 App Router, Chakra UI v3, Nx monorepo (`bunx nx test <project>`).

**Design spec:** `docs/superpowers/specs/2026-08-06-real-integrations-design.md`

## Global Constraints

- Real integrations only — no `MOCK_CHANNELS`, no `MockConnector`, no `simulate-release`, no `mock-connect`.
- OAuth Connect buttons disabled when server env vars for that channel are empty.
- Email uses workspace-level Resend API key stored encrypted via existing `ConnectionsService.saveTokens`.
- Webhook URL shown in UI: `{NEXT_PUBLIC_API_BASE_URL}/api/webhooks/github`.
- Drafts empty state copy: *"Publish a release on GitHub to generate drafts."*
- Chakra v3: `colorPalette`, `gap`, `disabled` — match existing dashboard pages.
- Run tests from repo root: `bunx nx test api`, `bunx nx test worker`, `bunx nx test web`.
- Commit after each task completes and tests pass.

---

### Task 1: Remove simulate-release from API

**Files:**
- Delete: `apps/api/src/app/webhooks/controllers/repository-simulate.controller.ts`
- Delete: `apps/api/src/app/webhooks/dtos/simulate-release.dto.ts`
- Delete: `apps/api/src/app/webhooks/__tests__/controllers/repository-simulate.controller.spec.ts`
- Modify: `apps/api/src/app/webhooks/services/webhooks.service.ts` — remove `simulateRelease` method (keep `acceptEvent` private method)
- Modify: `apps/api/src/app/webhooks/webhooks.module.ts` — remove `RepositorySimulateController` from controllers/imports
- Modify: `apps/api/src/app/webhooks/__tests__/services/webhooks.service.spec.ts` — remove `describe('WebhooksService.simulateRelease')` block

**Interfaces:**
- Removes: `POST /api/workspaces/:workspaceId/repositories/:id/simulate-release`
- Keeps: `WebhooksService.ingestNormalized()`, private `acceptEvent()` — used by real GitHub/Linear/Jira webhooks

- [ ] **Step 1: Delete simulate controller, DTO, and controller spec**

```bash
rm apps/api/src/app/webhooks/controllers/repository-simulate.controller.ts
rm apps/api/src/app/webhooks/dtos/simulate-release.dto.ts
rm apps/api/src/app/webhooks/__tests__/controllers/repository-simulate.controller.spec.ts
```

- [ ] **Step 2: Remove `simulateRelease` from WebhooksService**

Delete lines 44–56 in `webhooks.service.ts` (the entire `async simulateRelease(...)` method). Do not touch `ingestNormalized` or `acceptEvent`.

- [ ] **Step 3: Update webhooks.module.ts**

```typescript
// apps/api/src/app/webhooks/webhooks.module.ts
controllers: [WebhooksController],
// remove RepositorySimulateController import and registration
```

- [ ] **Step 4: Remove simulateRelease tests from webhooks.service.spec.ts**

Delete the entire `describe('WebhooksService.simulateRelease', () => { ... })` block.

- [ ] **Step 5: Run API tests**

Run: `bunx nx test api --testPathPatterns=webhooks`
Expected: PASS (no simulateRelease references)

- [ ] **Step 6: Commit**

```bash
git add -A apps/api/src/app/webhooks
git commit -m "refactor(api): remove simulate-release endpoint"
```

---

### Task 2: Remove mock-connect from API

**Files:**
- Modify: `apps/api/src/app/connections/controllers/connections.controller.ts` — remove `mockConnect` handler and unused `NotFoundException` import if no longer needed
- Delete: mock-connect tests block in `apps/api/src/app/connections/__tests__/controllers/connections.controller.spec.ts` (or delete file if empty)

**Interfaces:**
- Removes: `POST /api/workspaces/:workspaceId/connections/:channel/mock-connect`

- [ ] **Step 1: Remove mockConnect from ConnectionsController**

Delete the `@Post(':channel/mock-connect')` method (lines 33–43 in current file).

- [ ] **Step 2: Remove mockConnect tests**

Delete `describe('ConnectionsController.mockConnect', ...)` from `connections.controller.spec.ts`.

- [ ] **Step 3: Run API connection tests**

Run: `bunx nx test api --testPathPatterns=connections`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/app/connections
git commit -m "refactor(api): remove mock-connect endpoint"
```

---

### Task 3: Worker — always use real connectors

**Files:**
- Delete: `apps/worker/src/app/connectors/mock-connector.ts`
- Delete: `apps/worker/src/app/__tests__/connectors/mock-connector.spec.ts`
- Modify: `apps/worker/src/app/factories/connector-registry.factory.ts`
- Modify: `apps/worker/src/app/__tests__/factories/connector-registry.factory.spec.ts`

**Interfaces:**
- Produces: `buildConnectorRegistry(): ConnectorRegistry` — no parameters, no env flag

- [ ] **Step 1: Simplify connector-registry.factory.ts**

```typescript
import { ConnectorRegistry } from '@shipshout/integrations-core';
import { XConnector } from '@shipshout/integrations-x';
import { LinkedInConnector } from '@shipshout/integrations-linkedin';
import { EmailConnector } from '@shipshout/integrations-email';
import { BufferConnector } from '@shipshout/integrations-buffer';
import { MailchimpConnector } from '@shipshout/integrations-mailchimp';

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

- [ ] **Step 2: Delete mock connector files**

```bash
rm apps/worker/src/app/connectors/mock-connector.ts
rm apps/worker/src/app/__tests__/connectors/mock-connector.spec.ts
```

- [ ] **Step 3: Replace connector-registry.factory.spec.ts**

```typescript
import { Channel } from '@shipshout/database';
import { XConnector } from '@shipshout/integrations-x';
import { buildConnectorRegistry } from '../../factories/connector-registry.factory';

describe('buildConnectorRegistry', () => {
    it('wires real connectors for all channels', () => {
        const registry = buildConnectorRegistry();
        expect(registry.get(Channel.X)).toBeInstanceOf(XConnector);
        expect(registry.get(Channel.Email)).toBeDefined();
    });
});
```

- [ ] **Step 4: Grep for buildConnectorRegistry call sites — remove boolean arg if any**

Run: `rg 'buildConnectorRegistry\(' apps/worker`
Update any `buildConnectorRegistry(true|false)` calls to `buildConnectorRegistry()`.

- [ ] **Step 5: Run worker tests**

Run: `bunx nx test worker`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/worker
git commit -m "refactor(worker): remove MockConnector and MOCK_CHANNELS flag"
```

---

### Task 4: Repository list with last release status

**Files:**
- Modify: `apps/api/src/app/webhooks/repositories/release-event.repository.ts` — add `findLatestByRepositoryIds`
- Modify: `apps/api/src/app/repositories/repositories.module.ts` — register `ReleaseEventRepository`
- Modify: `apps/api/src/app/repositories/services/repositories.service.ts` — enrich list response
- Modify: `apps/api/src/app/repositories/controllers/repositories.controller.ts` — return enriched list (via service)
- Create: `apps/api/src/app/repositories/__tests__/services/repositories.service.spec.ts`

**Interfaces:**
- Consumes: `ReleaseEventRepository.findLatestByRepositoryIds(ids: string[]): Promise<Map<string, { createdAt: Date; status: ReleaseEventStatus }>>`
- Produces list item shape:
```typescript
{
  id: string;
  provider: string;
  name: string;
  enabled: boolean;
  lastReleaseAt: string | null;  // ISO
  lastReleaseStatus: 'received' | 'generating' | 'drafted' | 'failed' | null;
}
```

- [ ] **Step 1: Write failing test for enriched list**

```typescript
// apps/api/src/app/repositories/__tests__/services/repositories.service.spec.ts
import { RepositoriesService } from '../../services/repositories.service';
import { ReleaseEventStatus } from '@shipshout/database';

describe('RepositoriesService.list', () => {
    it('returns lastReleaseAt and lastReleaseStatus when events exist', async () => {
        const repos = {
            listForWorkspace: jest.fn(async () => [
                { id: 'r1', provider: 'github', name: 'org/repo', enabled: true },
            ]),
        };
        const events = {
            findLatestByRepositoryIds: jest.fn(async () =>
                new Map([['r1', { createdAt: new Date('2026-08-01T12:00:00Z'), status: ReleaseEventStatus.Drafted }]]),
            ),
        };
        const svc = new RepositoriesService(repos as any, { assertCanAddRepo: jest.fn() } as any, events as any);
        const res = await svc.list('w1');
        expect(res[0].lastReleaseAt).toBe('2026-08-01T12:00:00.000Z');
        expect(res[0].lastReleaseStatus).toBe('drafted');
    });

    it('returns null release fields when no events', async () => {
        const repos = {
            listForWorkspace: jest.fn(async () => [
                { id: 'r1', provider: 'github', name: 'org/repo', enabled: true },
            ]),
        };
        const events = { findLatestByRepositoryIds: jest.fn(async () => new Map()) };
        const svc = new RepositoriesService(repos as any, { assertCanAddRepo: jest.fn() } as any, events as any);
        const res = await svc.list('w1');
        expect(res[0].lastReleaseAt).toBeNull();
        expect(res[0].lastReleaseStatus).toBeNull();
    });
});
```

Note: adjust constructor injection order to match implementation.

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx nx test api --testPathPatterns=repositories.service`
Expected: FAIL — constructor arity or missing method

- [ ] **Step 3: Implement ReleaseEventRepository.findLatestByRepositoryIds**

```typescript
// apps/api/src/app/webhooks/repositories/release-event.repository.ts
async findLatestByRepositoryIds(repositoryIds: string[]) {
    if (repositoryIds.length === 0) return new Map<string, { createdAt: Date; status: ReleaseEvent['status'] }>();
    const rows = await this.createQueryBuilder('e')
        .select('e.repositoryId', 'repositoryId')
        .addSelect('MAX(e.createdAt)', 'createdAt')
        .where('e.repositoryId IN (:...ids)', { ids: repositoryIds })
        .groupBy('e.repositoryId')
        .getRawMany<{ repositoryId: string; createdAt: Date }>();
    // For each repo, fetch status of the latest event (second query or DISTINCT ON — use subquery for correctness):
    const latest = await this.createQueryBuilder('e')
        .distinctOn(['e.repositoryId'])
        .where('e.repositoryId IN (:...ids)', { ids: repositoryIds })
        .orderBy('e.repositoryId')
        .addOrderBy('e.createdAt', 'DESC')
        .getMany();
    return new Map(latest.map((e) => [e.repository.id, { createdAt: e.createdAt, status: e.status }]));
}
```

If `distinctOn` is awkward with TypeORM + eager relations, use a raw subquery — correctness matters more than elegance.

- [ ] **Step 4: Wire ReleaseEventRepository into RepositoriesModule and RepositoriesService.list**

```typescript
// repositories.service.ts
async list(workspaceId: string) {
    const repos = await this.repos.listForWorkspace(workspaceId);
    const latest = await this.events.findLatestByRepositoryIds(repos.map((r) => r.id));
    return repos.map((r) => {
        const ev = latest.get(r.id);
        return {
            id: r.id,
            provider: r.provider,
            name: r.name,
            enabled: r.enabled,
            lastReleaseAt: ev ? ev.createdAt.toISOString() : null,
            lastReleaseStatus: ev ? ev.status : null,
        };
    });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bunx nx test api --testPathPatterns=repositories.service`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/app/repositories apps/api/src/app/webhooks/repositories/release-event.repository.ts
git commit -m "feat(api): include last release status in repository list"
```

---

### Task 5: Email connect, disconnect, and OAuth config endpoints

**Files:**
- Create: `apps/api/src/app/connections/dtos/email-connect.dto.ts`
- Modify: `apps/api/src/app/connections/services/connections.service.ts`
- Modify: `apps/api/src/app/connections/controllers/connections.controller.ts`
- Modify: `apps/api/src/app/connections/utils/oauth.config.ts` — add `isOAuthConfigured(channel)` helper
- Modify: `apps/api/src/app/connections/__tests__/services/connections.service.spec.ts`
- Create: `apps/api/src/app/connections/__tests__/controllers/connections-email.controller.spec.ts` (or extend existing controller spec)

**Interfaces:**
- Produces: `GET /api/workspaces/:workspaceId/connections/config` → `{ x: boolean; linkedin: boolean; buffer: boolean; mailchimp: boolean; email: true }`
- Produces: `POST /api/workspaces/:workspaceId/connections/email/connect` body `{ apiKey: string }` → `{ connected: true }` or `400`
- Produces: `DELETE /api/workspaces/:workspaceId/connections/email` → `{ disconnected: true }`

- [ ] **Step 1: Write failing test for validateResendKey**

```typescript
// connections.service.spec.ts — add:
it('validateResendKey returns true for 200 from Resend domains API', async () => {
    const svc = new ConnectionsService({} as any);
    global.fetch = jest.fn(async () => ({ ok: true })) as any;
    await expect(svc.validateResendKey('re_test')).resolves.toBe(true);
});

it('validateResendKey throws for non-ok response', async () => {
    const svc = new ConnectionsService({} as any);
    global.fetch = jest.fn(async () => ({ ok: false, status: 401 })) as any;
    await expect(svc.validateResendKey('bad')).rejects.toThrow('Invalid Resend API key');
});
```

- [ ] **Step 2: Implement ConnectionsService helpers**

```typescript
async validateResendKey(apiKey: string): Promise<void> {
    const res = await fetch('https://api.resend.com/domains', {
        headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error('Invalid Resend API key');
}

async connectEmail(workspaceId: string, apiKey: string) {
    await this.validateResendKey(apiKey);
    return this.saveTokens(workspaceId, Channel.Email, { accessToken: apiKey });
}

async disconnectEmail(workspaceId: string) {
    const conn = await this.connections.findForWorkspaceAndChannel(workspaceId, Channel.Email);
    if (conn) await this.connections.remove(conn);
}

oauthConfig(): Record<string, boolean> {
    return {
        x: isOAuthConfigured(Channel.X),
        linkedin: isOAuthConfigured(Channel.LinkedIn),
        buffer: isOAuthConfigured(Channel.Buffer),
        mailchimp: isOAuthConfigured(Channel.Mailchimp),
        email: true,
    };
}
```

Add to `oauth.config.ts`:
```typescript
export function isOAuthConfigured(channel: Channel): boolean {
    try {
        const cfg = channelOAuthConfig(channel);
        return Boolean(cfg.clientId && cfg.clientSecret);
    } catch {
        return false;
    }
}
```

- [ ] **Step 3: Add controller routes — static routes BEFORE `:channel` routes**

```typescript
@Get('config')
config() {
    return this.svc.oauthConfig();
}

@Post('email/connect')
async connectEmail(@Param('workspaceId') ws: string, @Body() dto: EmailConnectDto) {
    try {
        await this.svc.connectEmail(ws, dto.apiKey);
        return { connected: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new BadRequestException(message);
    }
}

@Delete('email')
async disconnectEmail(@Param('workspaceId') ws: string) {
    await this.svc.disconnectEmail(ws);
    return { disconnected: true };
}
```

`EmailConnectDto`:
```typescript
export class EmailConnectDto {
    @IsString()
    @MinLength(1)
    apiKey!: string;
}
```

- [ ] **Step 4: Run API connection tests**

Run: `bunx nx test api --testPathPatterns=connections`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app/connections
git commit -m "feat(api): email Resend connect and OAuth config endpoint"
```

---

### Task 6: Web lib — remove mocks, add email/config helpers

**Files:**
- Modify: `apps/web/src/lib/repositories.ts` — remove `simulateRelease`
- Modify: `apps/web/src/lib/repositories.spec.ts` — remove simulate test
- Modify: `apps/web/src/lib/connections.ts` — remove `mockConnect`; add `connectEmail`, `disconnectEmail`, `connectionsConfig`
- Modify: `apps/web/src/lib/connections.spec.ts` — replace mock test with email/config tests

**Interfaces:**
- Produces: `connectEmail(ws: string, apiKey: string)` → `POST .../connections/email/connect`
- Produces: `disconnectEmail(ws: string)` → `DELETE .../connections/email`
- Produces: `connectionsConfig(ws: string)` → `GET .../connections/config`

- [ ] **Step 1: Update connections.ts**

```typescript
export const connectEmail = (ws: string, apiKey: string) =>
    apiFetch(`/workspaces/${ws}/connections/email/connect`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apiKey }),
    });

export const disconnectEmail = (ws: string) =>
    apiFetch(`/workspaces/${ws}/connections/email`, { method: 'DELETE' });

export const connectionsConfig = (ws: string) =>
    apiFetch(`/workspaces/${ws}/connections/config`);
```

Remove `mockConnect` export entirely.

- [ ] **Step 2: Remove simulateRelease from repositories.ts and its spec**

- [ ] **Step 3: Update connections.spec.ts**

```typescript
it('POSTs email connect', async () => {
    const spy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}'));
    await connectEmail('w1', 're_key');
    expect(spy).toHaveBeenCalledWith(
        'http://api.test/api/workspaces/w1/connections/email/connect',
        expect.objectContaining({ method: 'POST' }),
    );
});
```

- [ ] **Step 4: Run web lib tests**

Run: `bunx nx test web --testPathPatterns=lib`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib
git commit -m "refactor(web): replace mock lib helpers with real integration APIs"
```

---

### Task 7: RepositoryRow — webhook setup and release status UI

**Files:**
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/repository-row.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/page.tsx` — extend `Repo` type

**Interfaces:**
- Consumes: `SecretReveal`, `StatusBadge`, `listRepositories` response with `lastReleaseAt` / `lastReleaseStatus`
- Produces: collapsible **"Webhook & status"** panel per repo row

- [ ] **Step 1: Update Repo type in page.tsx**

```typescript
type Repo = {
    id: string;
    provider: string;
    name: string;
    enabled: boolean;
    lastReleaseAt: string | null;
    lastReleaseStatus: 'received' | 'generating' | 'drafted' | 'failed' | null;
};
```

- [ ] **Step 2: Rewrite repository-row.tsx**

Replace simulate-release form with:
- Collapsible trigger: **"Webhook & status"**
- Panel content:
  - `SecretReveal` for webhook URL: `` `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/webhooks/github` ``
  - Numbered setup steps (GitHub webhook settings, release events, secret at connect time)
  - Note: *"If you need the secret again, reconnect the repository."*
  - Status line:
    - No `lastReleaseAt`: muted *"Waiting for first release"*
    - Has `lastReleaseAt`: *"Last release received {formatted date}"* + `StatusBadge` mapped from `lastReleaseStatus`

Remove imports: `simulateRelease`, `Input`, `Textarea`, `Field`, simulate-related state.

- [ ] **Step 3: Manual check**

Run: `bun run dev:web-api` (or full `bun run dev`)
Navigate to `/{workspaceId}/settings/repositories` — confirm webhook URL copy works and status shows.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/\[workspaceId\]/settings/repositories
git commit -m "feat(web): repository webhook setup panel and release status"
```

---

### Task 8: ConnectionRow — real OAuth + email API key form

**Files:**
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/connections/connection-row.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/connections/page.tsx` — fetch `connectionsConfig`

**Interfaces:**
- Consumes: `connectionsConfig(workspaceId)` → `{ x, linkedin, buffer, mailchimp, email }`
- Email row: inline `Input` + Connect button calling `connectEmail(ws, apiKey)`
- OAuth rows: single Connect `<a href={connectUrl(...)}>` disabled when config false

- [ ] **Step 1: Fetch config in connections page.tsx**

```typescript
const [connections, config] = await Promise.all([
    listConnections(workspaceId),
    connectionsConfig(workspaceId),
]);
// pass oauthEnabled={config[channel]} to ConnectionRow (email always enabled)
```

- [ ] **Step 2: Rewrite connection-row.tsx**

- Remove `mockConnect` import and "Connect (test)" button
- For `channel === 'email'`: show `Field` + password `Input` + Connect button (calls `connectEmail`, `router.refresh()` on success, toaster on error)
- For OAuth channels: wrap Connect button — `disabled={!oauthEnabled}` with helper text when disabled: *"{LABEL} OAuth is not configured on this server."*
- Keep `StatusBadge` for connected state

- [ ] **Step 3: Manual check**

With empty OAuth env vars, X Connect should be disabled with helper text.
With a Resend test key, email connect should succeed and show Connected.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/\[workspaceId\]/settings/connections
git commit -m "feat(web): real-only connections with email API key form"
```

---

### Task 9: Env, README, and drafts empty state

**Files:**
- Modify: `.env.example` — remove `MOCK_CHANNELS`; add OAuth client ID/secret vars and `EMAIL_FROM`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/drafts/drafts-list.tsx` — update empty state description
- Modify: root `README.md` (if it mentions mock/simulate) — document real integration setup

**Interfaces:**
- Drafts empty state: `description="Publish a release on GitHub to generate drafts."`

- [ ] **Step 1: Update .env.example**

Remove lines 27–29 (`MOCK_CHANNELS` block). Add:

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

- [ ] **Step 2: Update drafts-list.tsx empty state copy**

Change description from *"Connect a repo and push a release to get started."* to *"Publish a release on GitHub to generate drafts."*

- [ ] **Step 3: Remove MOCK_CHANNELS from local `.env` if present** (do not commit `.env`)

- [ ] **Step 4: Run full test suite**

Run: `bunx nx test api && bunx nx test worker && bunx nx test web`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add .env.example apps/web/src/app/\(dashboard\)/\[workspaceId\]/drafts/drafts-list.tsx README.md
git commit -m "docs: remove MOCK_CHANNELS and document real integration env vars"
```

---

## Self-Review

**Spec coverage:**
| Spec section | Task |
|---|---|
| §2 Remove mock/simulate backend | Tasks 1–2 |
| §2 Worker always real | Task 3 |
| §3 Repository list + UI | Tasks 4, 7 |
| §4 Connections OAuth + email | Tasks 5, 8 |
| §6 Error handling | Tasks 5, 8 (disabled OAuth, invalid key 400) |
| §7 Testing | Each task includes test steps |
| §8 Implementation order | Tasks 1–9 follow spec order |
| Env/docs | Task 9 |

**Placeholder scan:** No TBD/TODO/similar-to entries.

**Type consistency:** `lastReleaseAt`/`lastReleaseStatus` defined in Task 4 API and consumed in Task 7 web. `connectionsConfig` booleans match Task 5 API and Task 8 UI props.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-06-real-integrations-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
