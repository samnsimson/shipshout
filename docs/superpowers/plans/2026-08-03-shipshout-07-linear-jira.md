# ShipShout Plan 7 — Linear + Jira Sources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Linear (sprint/issue completion) and Jira (board) webhook sources that normalize into the same `ReleaseEvent` → `generate` pipeline built in Plan 2/3.

**Architecture:** Reuse the ingestion pipeline. Add `libs/integrations/linear` and `libs/integrations/jira` with signature verification + payload normalization, and add source-specific webhook endpoints that share `WebhooksService` logic via a normalized handler. Gated behind the Growth tier's `sourceIntegrations` feature flag.

**Tech Stack:** NestJS, TypeORM, BullMQ, `@shipshout/billing` (feature gating).

## Global Constraints

- Same as Plans 1–6 Global Constraints.
- Linear/Jira sources require `PLAN_LIMITS[tier].sourceIntegrations === true` (Growth); otherwise the webhook is rejected.
- Both sources normalize to `{ externalId, commitSummary }` and reuse dedupe + `tryConsumeRelease`.

---

### Task 1: Generic normalized webhook handler in WebhooksService

**Files:**
- Modify: `apps/api/src/app/webhooks/webhooks.service.ts`
- Test: `apps/api/src/app/webhooks/webhooks.normalized.spec.ts`

**Interfaces:**
- Consumes: `RepositoriesService`, `ReleaseEvent` repo, `generate` queue, `TierService`, `SourceProvider`, `PLAN_LIMITS`.
- Produces: `WebhooksService.ingestNormalized(input: { source: SourceProvider; externalId: string; commitSummary: string; deliveryId: string; verified: boolean; requireSourceIntegration: boolean }): Promise<{ accepted: boolean; duplicate?: boolean }>` — shared path used by GitHub (refactor), Linear, Jira.

- [ ] **Step 1: Write the failing test**

```typescript
// webhooks.normalized.spec.ts
import { WebhooksService } from './webhooks.service';
import { SourceProvider, Tier } from '@shipshout/data-entities';

function make(tierAllows: boolean, dup = false) {
  const repos = { findByExternalId: jest.fn(async ()=>({ id:'r1', enabled:true, workspace:{ id:'w1' } })) };
  const events = { findOne: jest.fn(async ()=> dup ? { id:'e1' } : null), create:(d:any)=>d, save: jest.fn(async (d:any)=>({ id:'e1', ...d })) };
  const queue = { add: jest.fn(async ()=>({})) };
  const tier = { tryConsumeRelease: jest.fn(async ()=>true), sourceIntegrationsAllowed: jest.fn(async ()=>tierAllows) };
  const svc = new WebhooksService(repos as any, events as any, queue as any, tier as any);
  return { svc, events, queue };
}

describe('WebhooksService.ingestNormalized', () => {
  it('rejects Linear source when tier lacks source integrations', async () => {
    const { svc, queue } = make(false);
    const res = await svc.ingestNormalized({ source: SourceProvider.Linear, externalId:'x', commitSummary:'s', deliveryId:'d1', verified:true, requireSourceIntegration:true });
    expect(res.accepted).toBe(false);
    expect(queue.add).not.toHaveBeenCalled();
  });
  it('accepts and enqueues when verified + allowed', async () => {
    const { svc, events, queue } = make(true);
    const res = await svc.ingestNormalized({ source: SourceProvider.Linear, externalId:'x', commitSummary:'s', deliveryId:'d1', verified:true, requireSourceIntegration:true });
    expect(res.accepted).toBe(true);
    expect(events.save).toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalledWith('generate', { releaseEventId: 'e1' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test api`
Expected: FAIL — `ingestNormalized` / `sourceIntegrationsAllowed` not defined.

- [ ] **Step 3: Implement the shared handler + tier helper**

Add to `TierService` (Plan 6):

```typescript
// tier.service.ts — add
import { PLAN_LIMITS } from '@shipshout/billing';
async sourceIntegrationsAllowed(workspaceId: string): Promise<boolean> {
  const tier = await this.tier(workspaceId); // reuse private tier() — change to public or add wrapper
  return PLAN_LIMITS[tier].sourceIntegrations;
}
```

Refactor `WebhooksService` to add `ingestNormalized` and make `handleGithub` call it:

```typescript
// webhooks.service.ts — add
import { TierService } from '../billing/tier.service';
import { SourceProvider } from '@shipshout/data-entities';
// constructor(..., private tier: TierService)

async ingestNormalized(input: {
  source: SourceProvider; externalId: string; commitSummary: string; deliveryId: string;
  verified: boolean; requireSourceIntegration: boolean;
}): Promise<{ accepted: boolean; duplicate?: boolean }> {
  if (!input.verified) return { accepted: false };
  const repo = await this.repos.findByExternalId(input.source, input.externalId);
  if (!repo || !repo.enabled) return { accepted: false };
  const workspaceId = (repo as any).workspace.id;

  if (input.requireSourceIntegration && !(await this.tier.sourceIntegrationsAllowed(workspaceId))) {
    return { accepted: false };
  }
  const existing = await this.events.findOne({ where: { repository: { id: repo.id }, deliveryId: input.deliveryId } });
  if (existing) return { accepted: true, duplicate: true };
  if (!(await this.tier.tryConsumeRelease(workspaceId))) return { accepted: false };

  const saved = await this.events.save(this.events.create({
    repository: repo as any, source: input.source, deliveryId: input.deliveryId,
    rawPayload: { externalId: input.externalId }, commitSummary: input.commitSummary,
  }));
  await this.generateQueue.add('generate', { releaseEventId: saved.id });
  return { accepted: true, duplicate: false };
}
```

(GitHub's `handleGithub` now verifies signature, normalizes, then calls `ingestNormalized({ source: Github, requireSourceIntegration: false, verified: <sig result>, ... })`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "refactor(api): shared normalized webhook ingestion with tier gating"
```

---

### Task 2: Linear integration (verify + normalize)

**Files:**
- Create: `libs/integrations/linear/src/lib/verify-signature.ts`
- Create: `libs/integrations/linear/src/lib/normalize.ts`
- Test: `libs/integrations/linear/src/lib/normalize.spec.ts`

**Interfaces:**
- Consumes: raw body + `Linear-Signature` header; per-repo secret.
- Produces: `verifyLinearSignature(rawBody, signature, secret): boolean`; `normalizeLinear(payload): { externalId; commitSummary; isCompletion: boolean }`.

- [ ] **Step 1: Generate lib + write failing test**

```bash
npx nx g @nx/js:lib integrations-linear --directory=libs/integrations/linear --importPath=@shipshout/integrations-linear --unitTestRunner=jest
```

```typescript
// normalize.spec.ts
import { normalizeLinear } from './normalize';
it('marks completed issues and extracts summary', () => {
  const out = normalizeLinear({ action:'update', type:'Issue', data:{ id:'iss_1', title:'Fix cache', state:{ type:'completed' } } });
  expect(out.isCompletion).toBe(true);
  expect(out.externalId).toBe('iss_1');
  expect(out.commitSummary).toContain('Fix cache');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test integrations-linear`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// verify-signature.ts
import { createHmac, timingSafeEqual } from 'crypto';
export function verifyLinearSignature(rawBody: Buffer, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(signature ?? ''); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
```

```typescript
// normalize.ts
export function normalizeLinear(payload: any): { externalId: string; commitSummary: string; isCompletion: boolean } {
  const d = payload?.data ?? {};
  return {
    externalId: String(d.id ?? ''),
    commitSummary: [d.title, d.description].filter(Boolean).join('\n'),
    isCompletion: d?.state?.type === 'completed',
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test integrations-linear`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/integrations/linear
git commit -m "feat(integrations): Linear signature verify + payload normalizer"
```

---

### Task 3: Jira integration (verify + normalize)

**Files:**
- Create: `libs/integrations/jira/src/lib/verify.ts`
- Create: `libs/integrations/jira/src/lib/normalize.ts`
- Test: `libs/integrations/jira/src/lib/normalize.spec.ts`

**Interfaces:**
- Consumes: raw body + shared-secret query/header; per-repo secret.
- Produces: `verifyJiraSecret(providedSecret, expectedSecret): boolean`; `normalizeJira(payload): { externalId; commitSummary; isCompletion }`.

- [ ] **Step 1: Generate lib + write failing test**

```bash
npx nx g @nx/js:lib integrations-jira --directory=libs/integrations/jira --importPath=@shipshout/integrations-jira --unitTestRunner=jest
```

```typescript
// normalize.spec.ts
import { normalizeJira } from './normalize';
it('extracts issue summary and done status', () => {
  const out = normalizeJira({ webhookEvent:'jira:issue_updated', issue:{ id:'10001', fields:{ summary:'Ship checkout', status:{ statusCategory:{ key:'done' } } } } });
  expect(out.externalId).toBe('10001');
  expect(out.commitSummary).toContain('Ship checkout');
  expect(out.isCompletion).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test integrations-jira`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// verify.ts
import { timingSafeEqual } from 'crypto';
export function verifyJiraSecret(provided: string, expected: string): boolean {
  const a = Buffer.from(provided ?? ''); const b = Buffer.from(expected ?? '');
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}
```

```typescript
// normalize.ts
export function normalizeJira(payload: any): { externalId: string; commitSummary: string; isCompletion: boolean } {
  const issue = payload?.issue ?? {};
  const f = issue.fields ?? {};
  return {
    externalId: String(issue.id ?? ''),
    commitSummary: [f.summary, f.description].filter(Boolean).join('\n'),
    isCompletion: f?.status?.statusCategory?.key === 'done',
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test integrations-jira`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/integrations/jira
git commit -m "feat(integrations): Jira secret verify + payload normalizer"
```

---

### Task 4: Linear + Jira webhook endpoints

**Files:**
- Modify: `apps/api/src/app/webhooks/webhooks.controller.ts`
- Modify: `apps/api/src/app/webhooks/webhooks.service.ts` (add `handleLinear`, `handleJira`)
- Test: `apps/api/src/app/webhooks/linear-jira.spec.ts`

**Interfaces:**
- Consumes: `verifyLinearSignature`/`normalizeLinear`, `verifyJiraSecret`/`normalizeJira`, `RepositoriesService.decryptSecret`, `ingestNormalized`.
- Produces: `POST /api/webhooks/linear`, `POST /api/webhooks/jira`; `WebhooksService.handleLinear(rawBody, headers)`, `handleJira(rawBody, headers, query)` — verify, normalize, skip non-completions, then `ingestNormalized(..., requireSourceIntegration: true)`.

- [ ] **Step 1: Write the failing test**

```typescript
// linear-jira.spec.ts
import { createHmac } from 'crypto';
import { WebhooksService } from './webhooks.service';
import { SourceProvider } from '@shipshout/data-entities';

it('handleLinear ingests a completed issue', async () => {
  const secret = 'ls';
  const body = Buffer.from(JSON.stringify({ data:{ id:'iss_1', title:'Fix', state:{ type:'completed' } } }));
  const repos = { findByExternalId: jest.fn(async ()=>({ id:'r1', enabled:true, webhookSecret:'c', workspace:{ id:'w1' } })), decryptSecret: ()=>secret };
  const ingest = jest.fn(async ()=>({ accepted:true }));
  const svc = new WebhooksService(repos as any, {} as any, {} as any, {} as any);
  (svc as any).ingestNormalized = ingest;
  const sig = createHmac('sha256', secret).update(body).digest('hex');
  await svc.handleLinear(body, { 'linear-signature': sig });
  expect(ingest).toHaveBeenCalledWith(expect.objectContaining({ source: SourceProvider.Linear, requireSourceIntegration: true, verified: true }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test api`
Expected: FAIL — `handleLinear` not defined.

- [ ] **Step 3: Implement handlers + routes**

```typescript
// webhooks.service.ts — add
import { verifyLinearSignature, normalizeLinear } from '@shipshout/integrations-linear';
import { verifyJiraSecret, normalizeJira } from '@shipshout/integrations-jira';
import { SourceProvider } from '@shipshout/data-entities';

async handleLinear(rawBody: Buffer, headers: Record<string,string|undefined>) {
  const payload = JSON.parse(rawBody.toString('utf8'));
  const norm = normalizeLinear(payload);
  if (!norm.isCompletion) return { accepted: false };
  const repo = await this.repos.findByExternalId(SourceProvider.Linear, norm.externalId);
  const verified = !!repo && verifyLinearSignature(rawBody, headers['linear-signature'] ?? '', this.repos.decryptSecret(repo.webhookSecret));
  return this.ingestNormalized({
    source: SourceProvider.Linear, externalId: norm.externalId, commitSummary: norm.commitSummary,
    deliveryId: headers['linear-delivery'] ?? norm.externalId, verified, requireSourceIntegration: true,
  });
}

async handleJira(rawBody: Buffer, _headers: Record<string,string|undefined>, query: Record<string,string|undefined>) {
  const payload = JSON.parse(rawBody.toString('utf8'));
  const norm = normalizeJira(payload);
  if (!norm.isCompletion) return { accepted: false };
  const repo = await this.repos.findByExternalId(SourceProvider.Jira, norm.externalId);
  const verified = !!repo && verifyJiraSecret(query['secret'] ?? '', this.repos.decryptSecret(repo.webhookSecret));
  return this.ingestNormalized({
    source: SourceProvider.Jira, externalId: norm.externalId, commitSummary: norm.commitSummary,
    deliveryId: `${norm.externalId}:${payload?.timestamp ?? Date.now()}`, verified, requireSourceIntegration: true,
  });
}
```

```typescript
// webhooks.controller.ts — add routes
@Post('linear') @HttpCode(200)
linear(@Req() req: any, @Headers() headers: Record<string,string>) { return this.svc.handleLinear(req.rawBody, headers); }

@Post('jira') @HttpCode(200)
jira(@Req() req: any, @Headers() headers: Record<string,string>) { return this.svc.handleJira(req.rawBody, headers, req.query); }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test api`
Expected: PASS.

- [ ] **Step 5: Manual smoke test**

Run: register a Linear repo (Growth workspace), POST a signed completed-issue payload to `/api/webhooks/linear`.
Expected: `ReleaseEvent` (source `linear`) created; `generate` job enqueued; non-Growth workspace is rejected.

- [ ] **Step 6: Commit**

```bash
git add apps/api
git commit -m "feat(api): Linear and Jira webhook endpoints feeding the generation pipeline"
```

---

## Self-Review (Plan 7)

- **Spec coverage:** Linear (sprint/issue completion) + Jira (board) sources (§3, §7), feature gating to Growth `sourceIntegrations` (§8), reuse of dedupe + usage counters (§8), normalized ingestion (§3.1).
- **Type consistency:** `ingestNormalized` signature reused across GitHub/Linear/Jira; `SourceProvider` values match `findByExternalId`; `tryConsumeRelease`/`sourceIntegrationsAllowed` from Plan 6 `TierService`.
- **No placeholders:** all steps contain runnable code. (Note: Task 1 requires making `TierService.tier()` accessible to `sourceIntegrationsAllowed` — implement as a public method or internal wrapper.)
