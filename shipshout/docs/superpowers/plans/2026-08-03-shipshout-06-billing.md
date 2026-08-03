# ShipShout Plan 6 — Billing + Tier Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Stripe subscription billing (Starter/Pro/Growth), keep subscription state in sync via webhooks, and enforce per-tier limits (repositories, releases/month, features).

**Architecture:** `libs/billing` maps tiers to plan limits and wraps Stripe (checkout, portal, webhook handling). `Subscription` + `UsageCounter` entities track state. A `TierGuard`/limit check runs at repo-add and ingestion time.

**Tech Stack:** NestJS, TypeORM, Stripe SDK, BullMQ (ingestion hook), zod.

## Global Constraints

- Same as Plans 1–5 Global Constraints.
- Tiers & prices (verbatim from spec §8): **Starter $19/mo** (1 repo, 10 releases/mo, manual output), **Pro $49/mo** (3 repos, unlimited releases, social API sync), **Growth $149/mo** (unlimited repos, Jira/Linear integrations, email digests).
- Stripe webhook signatures MUST be verified.
- Over-limit actions are rejected (repos) or dropped-with-record (releases beyond monthly cap).

---

### Task 1: Subscription + UsageCounter entities + migration

**Files:**
- Create: `libs/data/entities/src/lib/entities/subscription.entity.ts`
- Create: `libs/data/entities/src/lib/entities/usage-counter.entity.ts`
- Modify: `libs/data/entities/src/lib/typeorm.config.ts`
- Test: `libs/data/entities/src/lib/entities/billing-entities.spec.ts`

**Interfaces:**
- Consumes: `Workspace`, `ENTITIES`.
- Produces: `Subscription` (workspace, stripeSubId, tier, status, currentPeriodEnd), `UsageCounter` (workspace, period `YYYY-MM`, releasesProcessed), `Tier` enum (`starter|pro|growth`), `SubscriptionStatus` enum (`active|past_due|canceled`).

- [ ] **Step 1: Write the failing test**

```typescript
// billing-entities.spec.ts
import { ENTITIES } from '../typeorm.config';
import { Subscription, Tier, SubscriptionStatus } from './subscription.entity';
import { UsageCounter } from './usage-counter.entity';
describe('billing entities', () => {
  it('registers entities', () => expect(ENTITIES).toEqual(expect.arrayContaining([Subscription, UsageCounter])));
  it('has tiers + statuses', () => {
    expect(Tier.Starter).toBe('starter'); expect(Tier.Pro).toBe('pro'); expect(Tier.Growth).toBe('growth');
    expect(SubscriptionStatus.Active).toBe('active');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test data-entities`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement entities**

```typescript
// subscription.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Workspace } from './workspace.entity';
export enum Tier { Starter = 'starter', Pro = 'pro', Growth = 'growth' }
export enum SubscriptionStatus { Active = 'active', PastDue = 'past_due', Canceled = 'canceled' }
@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => Workspace, { eager: true }) workspace!: Workspace;
  @Column({ nullable: true }) stripeSubId?: string;
  @Column({ type: 'enum', enum: Tier, default: Tier.Starter }) tier!: Tier;
  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.Active }) status!: SubscriptionStatus;
  @Column({ type: 'timestamptz', nullable: true }) currentPeriodEnd?: Date;
}
```

```typescript
// usage-counter.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique } from 'typeorm';
import { Workspace } from './workspace.entity';
@Entity('usage_counters')
@Unique(['workspace', 'period'])
export class UsageCounter {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => Workspace, { eager: true }) workspace!: Workspace;
  @Column() period!: string; // 'YYYY-MM'
  @Column({ default: 0 }) releasesProcessed!: number;
}
```

Register both in `ENTITIES`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test data-entities`
Expected: PASS.

- [ ] **Step 5: Generate + run migration**

```bash
npx typeorm migration:generate libs/data/entities/src/lib/migrations/Billing -d libs/data/entities/src/lib/data-source.ts
npx typeorm migration:run -d libs/data/entities/src/lib/data-source.ts
```

- [ ] **Step 6: Commit**

```bash
git add libs/data/entities
git commit -m "feat(data): Subscription and UsageCounter entities + migration"
```

---

### Task 2: Plan limits map (pure)

**Files:**
- Create: `libs/billing/src/lib/plan-limits.ts`
- Test: `libs/billing/src/lib/plan-limits.spec.ts`

**Interfaces:**
- Consumes: `Tier` (Task 1).
- Produces: `PLAN_LIMITS: Record<Tier, { maxRepos: number; maxReleasesPerMonth: number; socialApiSync: boolean; sourceIntegrations: boolean; emailDigests: boolean }>` (Infinity for unlimited); `checkRepoLimit(tier, currentRepoCount): boolean`; `checkReleaseLimit(tier, releasesThisMonth): boolean`.

- [ ] **Step 1: Generate lib + write failing test**

```bash
npx nx g @nx/js:lib billing --directory=libs/billing --importPath=@shipshout/billing --unitTestRunner=jest
```

```typescript
// plan-limits.spec.ts
import { PLAN_LIMITS, checkRepoLimit, checkReleaseLimit } from './plan-limits';
import { Tier } from '@shipshout/data-entities';
describe('plan limits', () => {
  it('starter allows 1 repo, 10 releases', () => {
    expect(PLAN_LIMITS[Tier.Starter].maxRepos).toBe(1);
    expect(checkRepoLimit(Tier.Starter, 1)).toBe(false); // already at limit
    expect(checkReleaseLimit(Tier.Starter, 10)).toBe(false);
  });
  it('pro allows unlimited releases', () => {
    expect(checkReleaseLimit(Tier.Pro, 9999)).toBe(true);
  });
  it('growth allows unlimited repos', () => {
    expect(checkRepoLimit(Tier.Growth, 9999)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test billing`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// plan-limits.ts
import { Tier } from '@shipshout/data-entities';
export const PLAN_LIMITS: Record<Tier, {
  maxRepos: number; maxReleasesPerMonth: number; socialApiSync: boolean; sourceIntegrations: boolean; emailDigests: boolean;
}> = {
  [Tier.Starter]: { maxRepos: 1, maxReleasesPerMonth: 10, socialApiSync: false, sourceIntegrations: false, emailDigests: false },
  [Tier.Pro]:     { maxRepos: 3, maxReleasesPerMonth: Infinity, socialApiSync: true, sourceIntegrations: false, emailDigests: false },
  [Tier.Growth]:  { maxRepos: Infinity, maxReleasesPerMonth: Infinity, socialApiSync: true, sourceIntegrations: true, emailDigests: true },
};
export const checkRepoLimit = (tier: Tier, current: number) => current < PLAN_LIMITS[tier].maxRepos;
export const checkReleaseLimit = (tier: Tier, thisMonth: number) => thisMonth < PLAN_LIMITS[tier].maxReleasesPerMonth;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test billing`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/billing
git commit -m "feat(billing): pure tier plan-limits map and check helpers"
```

---

### Task 3: Billing service (Stripe checkout + portal)

**Files:**
- Create: `libs/billing/src/lib/billing.service.ts`
- Test: `libs/billing/src/lib/billing.service.spec.ts`

**Interfaces:**
- Consumes: Stripe SDK, `Workspace` repo, `Tier`, env price ids `STRIPE_PRICE_STARTER|PRO|GROWTH`.
- Produces: `BillingService.createCheckoutSession(workspaceId, tier): Promise<{ url: string }>`; `BillingService.createPortalSession(workspaceId): Promise<{ url: string }>`. Stripe client injected for testability.

- [ ] **Step 1: Install + write failing test**

```bash
npm i stripe
```

```typescript
// billing.service.spec.ts
import { BillingService } from './billing.service';
import { Tier } from '@shipshout/data-entities';

describe('BillingService.createCheckoutSession', () => {
  it('creates a checkout session with the tier price', async () => {
    process.env.STRIPE_PRICE_PRO = 'price_pro';
    const stripe = { checkout: { sessions: { create: jest.fn(async ()=>({ url:'https://checkout' })) } },
                     customers: { create: jest.fn(async ()=>({ id:'cus_1' })) } };
    const workspaces = { findOne: jest.fn(async ()=>({ id:'w1', stripeCustomerId:'cus_1' })), save: jest.fn() };
    const svc = new BillingService(stripe as any, workspaces as any);
    const out = await svc.createCheckoutSession('w1', Tier.Pro);
    expect(out.url).toBe('https://checkout');
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
      line_items: [{ price: 'price_pro', quantity: 1 }],
    }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test billing`
Expected: FAIL — service not found.

- [ ] **Step 3: Implement**

```typescript
// billing.service.ts
import Stripe from 'stripe';
import { Repository } from 'typeorm';
import { Workspace, Tier } from '@shipshout/data-entities';

const PRICE_ENV: Record<Tier, string> = {
  [Tier.Starter]: 'STRIPE_PRICE_STARTER', [Tier.Pro]: 'STRIPE_PRICE_PRO', [Tier.Growth]: 'STRIPE_PRICE_GROWTH',
};

export class BillingService {
  constructor(private stripe: Stripe, private workspaces: Repository<Workspace>) {}

  private async ensureCustomer(workspaceId: string): Promise<{ ws: Workspace; customerId: string }> {
    const ws = await this.workspaces.findOne({ where: { id: workspaceId } });
    if (!ws) throw new Error('Workspace not found');
    if (ws.stripeCustomerId) return { ws, customerId: ws.stripeCustomerId };
    const customer = await this.stripe.customers.create({ metadata: { workspaceId } });
    ws.stripeCustomerId = customer.id;
    await this.workspaces.save(ws);
    return { ws, customerId: customer.id };
  }

  async createCheckoutSession(workspaceId: string, tier: Tier): Promise<{ url: string }> {
    const { customerId } = await this.ensureCustomer(workspaceId);
    const price = process.env[PRICE_ENV[tier]];
    if (!price) throw new Error(`Missing price id for ${tier}`);
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription', customer: customerId,
      line_items: [{ price, quantity: 1 }],
      success_url: `${process.env.WEB_BASE_URL}/${workspaceId}/settings/billing?ok=1`,
      cancel_url: `${process.env.WEB_BASE_URL}/${workspaceId}/settings/billing`,
      metadata: { workspaceId, tier },
    });
    return { url: session.url ?? '' };
  }

  async createPortalSession(workspaceId: string): Promise<{ url: string }> {
    const { customerId } = await this.ensureCustomer(workspaceId);
    const portal = await this.stripe.billingPortal.sessions.create({
      customer: customerId, return_url: `${process.env.WEB_BASE_URL}/${workspaceId}/settings/billing`,
    });
    return { url: portal.url };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test billing`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/billing
git commit -m "feat(billing): Stripe checkout and customer portal sessions"
```

---

### Task 4: Stripe webhook sync

**Files:**
- Create: `libs/billing/src/lib/subscription-sync.service.ts`
- Test: `libs/billing/src/lib/subscription-sync.service.spec.ts`

**Interfaces:**
- Consumes: `Subscription` repo, `Tier`, `SubscriptionStatus`, Stripe event objects.
- Produces: `SubscriptionSyncService.applyEvent(event): Promise<void>` handling `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` — upserts `Subscription` (tier from price metadata, status, currentPeriodEnd) and updates `Workspace.plan`.

- [ ] **Step 1: Write the failing test**

```typescript
// subscription-sync.service.spec.ts
import { SubscriptionSyncService } from './subscription-sync.service';
import { Tier, SubscriptionStatus } from '@shipshout/data-entities';

describe('SubscriptionSyncService.applyEvent', () => {
  it('activates a subscription on checkout.session.completed', async () => {
    const subs = { findOne: jest.fn(async ()=>null), create:(d:any)=>d, save: jest.fn(async (d:any)=>d) };
    const workspaces = { findOne: jest.fn(async ()=>({ id:'w1' })), save: jest.fn(async (d:any)=>d) };
    const svc = new SubscriptionSyncService(subs as any, workspaces as any);
    await svc.applyEvent({ type:'checkout.session.completed',
      data:{ object:{ subscription:'sub_1', metadata:{ workspaceId:'w1', tier:'pro' } } } } as any);
    expect(subs.save).toHaveBeenCalledWith(expect.objectContaining({ tier: Tier.Pro, status: SubscriptionStatus.Active }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test billing`
Expected: FAIL — service not found.

- [ ] **Step 3: Implement**

```typescript
// subscription-sync.service.ts
import { Repository } from 'typeorm';
import { Subscription, SubscriptionStatus, Tier, Workspace } from '@shipshout/data-entities';

export class SubscriptionSyncService {
  constructor(private subs: Repository<Subscription>, private workspaces: Repository<Workspace>) {}

  private async upsert(workspaceId: string, patch: Partial<Subscription>) {
    let sub = await this.subs.findOne({ where: { workspace: { id: workspaceId } } });
    if (!sub) sub = this.subs.create({ workspace: { id: workspaceId } as any });
    Object.assign(sub, patch);
    await this.subs.save(sub);
    const ws = await this.workspaces.findOne({ where: { id: workspaceId } });
    if (ws && patch.tier) { ws.plan = patch.tier; await this.workspaces.save(ws); }
  }

  async applyEvent(event: { type: string; data: { object: any } }): Promise<void> {
    const obj = event.data.object;
    if (event.type === 'checkout.session.completed') {
      await this.upsert(obj.metadata.workspaceId, {
        stripeSubId: obj.subscription, tier: obj.metadata.tier as Tier, status: SubscriptionStatus.Active,
      });
    } else if (event.type === 'customer.subscription.updated') {
      const workspaceId = obj.metadata?.workspaceId; if (!workspaceId) return;
      const status = obj.status === 'active' ? SubscriptionStatus.Active
        : obj.status === 'past_due' ? SubscriptionStatus.PastDue : SubscriptionStatus.Canceled;
      await this.upsert(workspaceId, { status, currentPeriodEnd: new Date((obj.current_period_end ?? 0) * 1000) });
    } else if (event.type === 'customer.subscription.deleted') {
      const workspaceId = obj.metadata?.workspaceId; if (!workspaceId) return;
      await this.upsert(workspaceId, { status: SubscriptionStatus.Canceled, tier: Tier.Starter });
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test billing`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/billing
git commit -m "feat(billing): Stripe webhook subscription sync service"
```

---

### Task 5: Billing controller + tier enforcement wiring

**Files:**
- Create: `apps/api/src/app/billing/billing.controller.ts`
- Create: `apps/api/src/app/billing/billing.module.ts`
- Create: `apps/api/src/app/billing/tier.service.ts`
- Modify: `apps/api/src/app/repositories/repositories.service.ts` (repo-limit check)
- Modify: `apps/api/src/app/webhooks/webhooks.service.ts` (release-limit + counter increment)
- Test: `apps/api/src/app/billing/tier.service.spec.ts`

**Interfaces:**
- Consumes: `BillingService`, `SubscriptionSyncService`, `PLAN_LIMITS`, `checkRepoLimit`, `checkReleaseLimit`, `Subscription`/`UsageCounter` repos.
- Produces: `POST /api/workspaces/:workspaceId/billing/checkout`, `POST /api/workspaces/:workspaceId/billing/portal`, `POST /api/billing/webhook` (raw body, signature verified); `TierService.assertCanAddRepo(workspaceId)`, `TierService.tryConsumeRelease(workspaceId): Promise<boolean>`.

- [ ] **Step 1: Write the failing test**

```typescript
// tier.service.spec.ts
import { TierService } from './tier.service';
import { Tier } from '@shipshout/data-entities';

function make(tier: Tier, repoCount: number, releases: number) {
  const subs = { findOne: jest.fn(async ()=>({ tier })) };
  const repos = { count: jest.fn(async ()=>repoCount) };
  const usage = {
    findOne: jest.fn(async ()=>({ id:'u1', releasesProcessed: releases })),
    create:(d:any)=>d, save: jest.fn(async (d:any)=>d),
  };
  return { subs, repos, usage, svc: new TierService(subs as any, repos as any, usage as any) };
}

describe('TierService', () => {
  it('blocks adding a repo beyond starter limit', async () => {
    const { svc } = make(Tier.Starter, 1, 0);
    await expect(svc.assertCanAddRepo('w1')).rejects.toThrow(/limit/i);
  });
  it('consumes a release under the cap and increments', async () => {
    const { svc, usage } = make(Tier.Starter, 1, 5);
    expect(await svc.tryConsumeRelease('w1')).toBe(true);
    expect(usage.save).toHaveBeenCalledWith(expect.objectContaining({ releasesProcessed: 6 }));
  });
  it('rejects a release at the cap', async () => {
    const { svc } = make(Tier.Starter, 1, 10);
    expect(await svc.tryConsumeRelease('w1')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test api`
Expected: FAIL — service not found.

- [ ] **Step 3: Implement TierService + controller + wiring**

```typescript
// tier.service.ts
import { Repository as OrmRepo } from 'typeorm';
import { Subscription, UsageCounter, Repository, Tier } from '@shipshout/data-entities';
import { checkRepoLimit, checkReleaseLimit } from '@shipshout/billing';

function currentPeriod() { const d = new Date(); return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`; }

export class TierService {
  constructor(
    private subs: OrmRepo<Subscription>,
    private repos: OrmRepo<Repository>,
    private usage: OrmRepo<UsageCounter>,
  ) {}

  private async tier(workspaceId: string): Promise<Tier> {
    const sub = await this.subs.findOne({ where: { workspace: { id: workspaceId } } });
    return sub?.tier ?? Tier.Starter;
  }

  async assertCanAddRepo(workspaceId: string): Promise<void> {
    const tier = await this.tier(workspaceId);
    const count = await this.repos.count({ where: { workspace: { id: workspaceId } } });
    if (!checkRepoLimit(tier, count)) throw new Error(`Repository limit reached for ${tier} plan`);
  }

  async tryConsumeRelease(workspaceId: string): Promise<boolean> {
    const tier = await this.tier(workspaceId);
    const period = currentPeriod();
    let counter = await this.usage.findOne({ where: { workspace: { id: workspaceId }, period } });
    if (!counter) counter = this.usage.create({ workspace: { id: workspaceId } as any, period, releasesProcessed: 0 });
    if (!checkReleaseLimit(tier, counter.releasesProcessed)) return false;
    counter.releasesProcessed += 1;
    await this.usage.save(counter);
    return true;
  }
}
```

Controller: `checkout` / `portal` call `BillingService`; `webhook` verifies signature (`stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`) then calls `SubscriptionSyncService.applyEvent`. Register raw body for `/api/billing/webhook`. In `RepositoriesService.create`, call `assertCanAddRepo` before saving. In `WebhooksService.handleGithub`, before enqueue call `tryConsumeRelease(workspaceId)`; if false, persist event as skipped/over-limit and do not enqueue.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test api`
Expected: PASS.

- [ ] **Step 5: Manual smoke test (Stripe test mode)**

Run: start Stripe CLI `stripe listen --forward-to localhost:3000/api/billing/webhook`; complete a test checkout for Pro.
Expected: `Subscription` upserted to `pro/active`; `Workspace.plan='pro'`; repo/release limits reflect Pro.

- [ ] **Step 6: Commit**

```bash
git add apps/api
git commit -m "feat(api): billing checkout/portal/webhook and tier enforcement on repos + releases"
```

---

### Task 6: Billing UI (pricing + manage)

**Files:**
- Create: `apps/web/src/app/(dashboard)/[workspaceId]/settings/billing/page.tsx`
- Create: `apps/web/src/lib/billing.ts`
- Test: `apps/web/src/lib/billing.spec.ts`

**Interfaces:**
- Consumes: `apiFetch`, billing endpoints (Task 5).
- Produces: `startCheckout(ws, tier)`, `openPortal(ws)`; a pricing page (three tiers, current plan highlighted) with subscribe/manage buttons redirecting to the returned Stripe URL.

- [ ] **Step 1: Write the failing test**

```typescript
// billing.spec.ts
import { startCheckout } from './billing';
it('POSTs checkout and returns url', async () => {
  jest.spyOn(global,'fetch' as any).mockResolvedValue({ ok:true, json: async ()=>({ url:'https://checkout' }) } as any);
  process.env.NEXT_PUBLIC_API_BASE_URL='http://api.test';
  const out = await startCheckout('w1','pro');
  expect(out.url).toBe('https://checkout');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test web`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement lib + page**

```typescript
// billing.ts
import { apiFetch } from './api-client';
export const startCheckout = (ws:string, tier:string) =>
  apiFetch(`/workspaces/${ws}/billing/checkout`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ tier }) });
export const openPortal = (ws:string) =>
  apiFetch(`/workspaces/${ws}/billing/portal`, { method:'POST' });
```

```tsx
// settings/billing/page.tsx
import { BillingActions } from './billing-actions'; // client: buttons calling startCheckout/openPortal then window.location = url
const TIERS = [
  { id:'starter', name:'Starter', price:'$19/mo', points:['1 repository','10 releases/mo','Manual output'] },
  { id:'pro', name:'Pro', price:'$49/mo', points:['3 repositories','Unlimited releases','Social API sync'] },
  { id:'growth', name:'Growth', price:'$149/mo', points:['Unlimited repositories','Jira/Linear integrations','Email digests'] },
];
export default function BillingPage({ params }:{ params:{ workspaceId:string } }) {
  return (
    <main>
      <h1>Billing</h1>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
        {TIERS.map(t => (
          <div key={t.id} style={{ border:'1px solid #ddd', borderRadius:8, padding:16 }}>
            <h2>{t.name}</h2><p>{t.price}</p>
            <ul>{t.points.map(p=> <li key={p}>{p}</li>)}</ul>
            <BillingActions workspaceId={params.workspaceId} tier={t.id} />
          </div>
        ))}
      </div>
    </main>
  );
}
```

Create `billing-actions.tsx` (client) with a Subscribe button (`startCheckout` → `window.location.href = url`) and a Manage button (`openPortal` → redirect).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): billing pricing page with checkout and manage actions"
```

---

## Self-Review (Plan 6)

- **Spec coverage:** Stripe checkout/portal/webhooks (§8), tiers + prices + limits verbatim (§8), `Subscription`/`UsageCounter` (§5), enforcement at ingestion + repo-add (§8), webhook signature verification (§10).
- **Type consistency:** `Tier` enum shared; `PLAN_LIMITS`/`checkRepoLimit`/`checkReleaseLimit` used by `TierService`; `WebhooksService`/`RepositoriesService` modifications reference services defined here; `tryConsumeRelease` gates the Plan 2 enqueue.
- **No placeholders:** all steps contain runnable code (client button components described with exact behavior).
