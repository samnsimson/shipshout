# Stripe Billing via Better Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship DB-backed Free/Starter/Pro plans, Better Auth Stripe (customer, Checkout, portal, webhooks), Nest read APIs for plans/subscription/invoices, and a minimal Settings Billing UI.

**Architecture:** `@better-auth/stripe` on `/auth-service` owns writes and webhooks. `subscription_plans` in the app DB feeds a dynamic `plans` loader via `AuthOptions.getSubscriptionPlans`. Nest `subscriptions` / `payments` modules are authenticated read APIs. Dashboard uses server actions + cookie forwarding for upgrade/portal (same pattern as existing `/auth/*`), and Nest/OpenAPI for reads.

**Tech Stack:** NestJS 11, TypeORM, Better Auth + `@better-auth/stripe`, Stripe SDK v22, Next.js App Router, Chakra UI v3, bun, Jest, `@shipshout/api-client`

**Spec:** `docs/superpowers/specs/2026-08-11-stripe-billing-better-auth-design.md`

## Global Constraints

- Nest billing routes are **read-only**; Checkout / cancel / portal go through Better Auth Stripe (`/auth-service/subscription/*`).
- Billing subject: **user** (`customerType: 'user'`); do not implement org billing.
- Plans: **free** (no Stripe price) + **starter** (trial 14 days) + **pro** (no trial). Growth out of scope.
- Limits JSON: free `{ repos: 0, releasesPerMonth: 0 }`; starter `{ repos: 1, releasesPerMonth: 10 }`; pro `{ repos: 3, releasesPerMonth: null }` (null = unlimited).
- Do not commit Stripe secrets; document env names in `.env.example` only; copy values from `shipshout_back` locally.
- Prettier: 4-space, single quotes, printWidth 160; single-statement `if` without braces.
- Follow `DESIGN.md` for dashboard Billing UI.
- `@better-auth/stripe` and `stripe` are already in root `package.json`; add them to `libs/auth/package.json` when wiring auth.
- Controller paths: `/subscriptions` and `/payments` (plural), matching the design spec (replace Nest CLI stubs under `subscription` / `payments`).

## File map

| File | Responsibility |
| ---- | -------------- |
| `libs/database/src/lib/entities/subscription-plan.entity.ts` | TypeORM `subscription_plans` entity |
| `libs/database/src/lib/entities/index.ts` | Register entity in `ENTITIES` |
| `libs/database/src/lib/repositories/subscription-plan.repository.ts` | Plan queries (active, by name) |
| `libs/database/src/lib/migrations/<ts>-SubscriptionPlans.ts` | Table + seed `free` row |
| `libs/auth/src/lib/billing/subscription-plan.types.ts` | Shared plan DTO for auth loader |
| `libs/auth/src/lib/billing/map-plans-for-stripe.ts` | DB row → Better Auth plan shape |
| `libs/auth/src/lib/auth.config.ts` | Register `stripe()` plugin + dynamic plans |
| `libs/auth/src/lib/contracts/schema/auth.schema.ts` | Stripe keys + `getSubscriptionPlans` |
| `apps/shipshout-api-svc/src/app/subscription/**` | Read APIs: plans + me |
| `apps/shipshout-api-svc/src/app/payments/**` | Read API: invoices |
| `apps/shipshout-api-svc/src/app/app.module.ts` | Wire Stripe env + plan loader |
| `.env.example` | Stripe env names |
| `apps/shipshout-client-dashboard/src/lib/billing/**` | Server actions + API helpers |
| `apps/shipshout-client-dashboard/src/components/settings/billing-section.tsx` | Billing UI |
| `apps/shipshout-client-dashboard/src/app/(dashboard)/dashboard/settings/page.tsx` | Compose Billing section |

---

### Task 1: `subscription_plans` entity, repository, migration

**Files:**

- Create: `libs/database/src/lib/entities/subscription-plan.entity.ts`
- Create: `libs/database/src/lib/repositories/subscription-plan.repository.ts`
- Modify: `libs/database/src/lib/entities/index.ts`
- Modify: `libs/database/src/lib/repositories/index.ts`
- Create: migration via `bun run migration:generate` (or hand-write under `libs/database/src/lib/migrations/`)
- Test: `libs/database/src/lib/__tests__/subscription-plan.repository.spec.ts` (optional unit on mapper helpers if repo is thin; at minimum entity exports compile)

**Interfaces:**

- Produces:
    - `SubscriptionPlanLimits = { repos: number; releasesPerMonth: number | null }`
    - `class SubscriptionPlanEntity` table `subscription_plans` with columns: `id` uuid PK, `name` unique varchar, `displayName`, `stripePriceId` nullable, `stripeAnnualPriceId` nullable, `trialDays` nullable int, `limits` jsonb, `isActive` boolean default true, `sortOrder` int, `createdAt`/`updatedAt` timestamptz
    - `class SubscriptionPlanRepository extends BaseRepository<SubscriptionPlanEntity>` with `findActiveOrdered(): Promise<SubscriptionPlanEntity[]>` and `findActiveByName(name: string): Promise<SubscriptionPlanEntity | null>`

- [ ] **Step 1: Add entity + register in `ENTITIES`**

```typescript
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type SubscriptionPlanLimits = { repos: number; releasesPerMonth: number | null };

@Entity('subscription_plans')
export class SubscriptionPlanEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 64, unique: true })
    name!: string;

    @Column({ type: 'varchar', length: 128 })
    displayName!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    stripePriceId!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    stripeAnnualPriceId!: string | null;

    @Column({ type: 'int', nullable: true })
    trialDays!: number | null;

    @Column({ type: 'jsonb' })
    limits!: SubscriptionPlanLimits;

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    @Column({ type: 'int', default: 0 })
    sortOrder!: number;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt!: Date;
}
```

- [ ] **Step 2: Add `SubscriptionPlanRepository`**

```typescript
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SubscriptionPlanEntity } from '../entities/subscription-plan.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class SubscriptionPlanRepository extends BaseRepository<SubscriptionPlanEntity> {
    constructor(dataSource: DataSource) {
        super(SubscriptionPlanEntity, dataSource);
    }

    findActiveOrdered(): Promise<SubscriptionPlanEntity[]> {
        return this.find({ where: { isActive: true }, order: { sortOrder: 'ASC' } });
    }

    findActiveByName(name: string): Promise<SubscriptionPlanEntity | null> {
        return this.findOne({ where: { name, isActive: true } });
    }
}
```

- [ ] **Step 3: Generate migration and seed `free` in `up()`**

After entity is registered, run:

```bash
bun run migration:generate
```

Edit the generated `up` to also insert Free (idempotent via ON CONFLICT if unique on `name`):

```sql
INSERT INTO subscription_plans (id, name, display_name, stripe_price_id, stripe_annual_price_id, trial_days, limits, is_active, sort_order)
VALUES (
  uuid_generate_v4(),
  'free',
  'Free',
  NULL,
  NULL,
  NULL,
  '{"repos":0,"releasesPerMonth":0}'::jsonb,
  true,
  0
);
```

`down` drops the table (and seed with it).

- [ ] **Step 4: Run migration locally**

```bash
bun run migration:run
```

Expected: table exists; one `free` row.

- [ ] **Step 5: Commit**

```bash
git add libs/database
git commit -m "feat(database): add subscription_plans entity and migration"
```

---

### Task 2: Seed Starter/Pro + plan mapper for Better Auth

**Files:**

- Create: `libs/auth/src/lib/billing/subscription-plan.types.ts`
- Create: `libs/auth/src/lib/billing/map-plans-for-stripe.ts`
- Create: `libs/auth/src/lib/__tests__/map-plans-for-stripe.spec.ts`
- Create: `apps/shipshout-api-svc/src/app/subscription/subscription-plans.seed.ts` (Nest `OnModuleInit` upsert)
- Modify: subscription module to register seed provider (Task 5 can wire module; for this task keep seed class ready)

**Interfaces:**

- Produces:
    - `export type AuthBillablePlanRow = { name: string; stripePriceId: string; stripeAnnualPriceId?: string | null; trialDays?: number | null; limits: Record<string, number | null> }`
    - `export type GetSubscriptionPlans = () => Promise<AuthBillablePlanRow[]>`
    - `export function mapPlansForStripe(rows: AuthBillablePlanRow[]): Array<{ name: string; priceId: string; annualDiscountPriceId?: string; freeTrial?: { days: number }; limits: Record<string, number | null> }>` — skip rows without `stripePriceId`; include `freeTrial` only when `trialDays` is a positive number

- [ ] **Step 1: Write failing mapper test**

```typescript
import { mapPlansForStripe } from '../billing/map-plans-for-stripe';

describe('mapPlansForStripe', () => {
    it('maps billable rows and skips missing price ids', () => {
        const result = mapPlansForStripe([
            { name: 'free', stripePriceId: '', trialDays: null, limits: { repos: 0, releasesPerMonth: 0 } },
            { name: 'starter', stripePriceId: 'price_s', trialDays: 14, limits: { repos: 1, releasesPerMonth: 10 } },
            { name: 'pro', stripePriceId: 'price_p', trialDays: null, limits: { repos: 3, releasesPerMonth: null } },
        ]);
        expect(result).toEqual([
            { name: 'starter', priceId: 'price_s', freeTrial: { days: 14 }, limits: { repos: 1, releasesPerMonth: 10 } },
            { name: 'pro', priceId: 'price_p', limits: { repos: 3, releasesPerMonth: null } },
        ]);
    });
});
```

- [ ] **Step 2: Implement mapper; run `nx test auth --testPathPattern=map-plans-for-stripe`; expect PASS**

- [ ] **Step 3: Add `SubscriptionPlansSeed` service**

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionPlanRepository } from '@shipshout/database';

@Injectable()
export class SubscriptionPlansSeed implements OnModuleInit {
    private readonly logger = new Logger(SubscriptionPlansSeed.name);

    constructor(
        private readonly plans: SubscriptionPlanRepository,
        private readonly config: ConfigService,
    ) {}

    async onModuleInit(): Promise<void> {
        const starterPrice = this.config.get<string>('STRIPE_PRICE_STARTER');
        const proPrice = this.config.get<string>('STRIPE_PRICE_PRO');
        await this.upsert({
            name: 'starter',
            displayName: 'Starter',
            stripePriceId: starterPrice ?? null,
            trialDays: 14,
            limits: { repos: 1, releasesPerMonth: 10 },
            sortOrder: 1,
        });
        await this.upsert({
            name: 'pro',
            displayName: 'Pro',
            stripePriceId: proPrice ?? null,
            trialDays: null,
            limits: { repos: 3, releasesPerMonth: null },
            sortOrder: 2,
        });
        if (!starterPrice || !proPrice) this.logger.warn('STRIPE_PRICE_STARTER/PRO missing; billable plans seeded without price ids');
    }

    private async upsert(input: {
        name: string;
        displayName: string;
        stripePriceId: string | null;
        trialDays: number | null;
        limits: { repos: number; releasesPerMonth: number | null };
        sortOrder: number;
    }): Promise<void> {
        const existing = await this.plans.findOne({ where: { name: input.name } });
        if (existing) {
            existing.displayName = input.displayName;
            existing.stripePriceId = input.stripePriceId;
            existing.trialDays = input.trialDays;
            existing.limits = input.limits;
            existing.sortOrder = input.sortOrder;
            existing.isActive = true;
            await this.plans.save(existing);
            return;
        }
        await this.plans.save(this.plans.create({ ...input, stripeAnnualPriceId: null, isActive: true }));
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add libs/auth/src/lib/billing apps/shipshout-api-svc/src/app/subscription/subscription-plans.seed.ts
git commit -m "feat(billing): add Stripe plan mapper and Starter/Pro seed"
```

---

### Task 3: Wire `@better-auth/stripe` into `createAuth`

**Files:**

- Modify: `libs/auth/package.json` — add `"@better-auth/stripe": "^1.6.26"`, `"stripe": "^22.0.0"`
- Modify: `libs/auth/src/lib/contracts/schema/auth.schema.ts`
- Modify: `libs/auth/src/lib/auth.config.ts`
- Modify: `libs/auth/src/lib/__tests__/auth.module.spec.ts` (and any createAuth tests) to mock stripe plugin
- Create: `libs/auth/src/lib/__tests__/auth.config.stripe.spec.ts`

**Interfaces:**

- Extends `AuthOptions` via zod:
    - `stripeSecretKey: z.string().optional()`
    - `stripeWebhookSecret: z.string().optional()`
    - `getSubscriptionPlans: z.custom<GetSubscriptionPlans>().optional()`
- `createAuth(opts)`:
    - If `stripeSecretKey` and `stripeWebhookSecret` are both set, append `stripe({ stripeClient: new Stripe(opts.stripeSecretKey, { apiVersion: '2026-06-24.dahlia' }), stripeWebhookSecret, createCustomerOnSignUp: true, subscription: { enabled: true, plans: async () => mapPlansForStripe(await (opts.getSubscriptionPlans?.() ?? [])) } })`
    - If only one of the two secrets is set, `throw new Error('STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are both required when enabling Stripe')`
    - If neither set (unit tests / CLI without billing), omit plugin
- CLI `export const auth = createAuth({...})` reads `process.env.STRIPE_*` and optional `getSubscriptionPlans` that returns `[]` (migrate schema does not need live plans)

- [ ] **Step 1: Write failing test** — when both secrets provided, `betterAuth` is called with a plugins array containing a stripe plugin (mock `@better-auth/stripe` and `stripe`).

```typescript
jest.mock('@better-auth/stripe', () => ({ stripe: jest.fn(() => ({ id: 'stripe-plugin' })) }));
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({ })));
// import createAuth after mocks
it('registers stripe plugin when secrets are set', () => {
    createAuth({
        databaseUrl: 'postgres://x',
        clientAppUrl: 'http://localhost:3000',
        stripeSecretKey: 'sk_test',
        stripeWebhookSecret: 'whsec_test',
        getSubscriptionPlans: async () => [{ name: 'starter', stripePriceId: 'price_s', limits: { repos: 1, releasesPerMonth: 10 }, trialDays: 14 }],
    });
    const { stripe } = require('@better-auth/stripe');
    expect(stripe).toHaveBeenCalled();
});
```

- [ ] **Step 2: Implement schema + `createAuth` changes; make test pass**

- [ ] **Step 3: Run auth migrate for plugin tables**

```bash
# ensure STRIPE_* set in env so CLI auth instance includes plugin schema, OR temporarily enable plugin in CLI export
bun run auth:migrate
```

Expected: Better Auth adds subscription/customer columns/tables under `auth` schema.

Document webhook URL for ops: `{BETTER_AUTH_BASE_URL}/auth-service/stripe/webhook`.

- [ ] **Step 4: Commit**

```bash
git add libs/auth package.json bun.lock
git commit -m "feat(auth): integrate Better Auth Stripe plugin with DB-backed plans"
```

---

### Task 4: Nest `subscriptions` read API

**Files:**

- Replace stubs under `apps/shipshout-api-svc/src/app/subscription/`:
    - Delete empty `entities/`, `dto/create-subscription.dto.ts`, `dto/update-subscription.dto.ts`, write CRUD methods
    - Create: `dto/subscription-plan-response.dto.ts`, `dto/subscription-me-response.dto.ts`, `dto/subscription-plans-list-response.dto.ts`
    - Rewrite: `subscription.service.ts`, `subscription.controller.ts`, `subscription.module.ts`
    - Rewrite specs: `subscription.service.spec.ts`, `subscription.controller.spec.ts`
- Controller path: `@Controller('subscriptions')`

**Interfaces:**

- Consumes: `SubscriptionPlanRepository`, `AuthService` or `BetterAuthService` via `listActiveSubscriptions`
- Produces:
    - `GET /subscriptions/plans` → `{ plans: Array<{ name, displayName, trialDays, limits, isBillable }> }` (`isBillable = Boolean(stripePriceId)`)
    - `GET /subscriptions/me` → `{ plan: string; status: string | null; periodEnd: string | null; stripeSubscriptionId: string | null; limits: SubscriptionPlanLimits }`
    - `getMe(userId, headers)`: call `betterAuth.api.listActiveSubscriptions({ headers: fromNodeHeaders(headers), query: {} })`; pick first with `status === 'active' || status === 'trialing'`; if none, load `free` plan from DB; else use subscription `plan` name to load limits from DB (fallback to subscription.limits if present)

- [ ] **Step 1: Write failing service tests** (mock plan repo + betterAuth.api)

```typescript
it('returns free when no active subscription', async () => {
    betterAuth.api.listActiveSubscriptions.mockResolvedValue([]);
    plans.findActiveByName.mockResolvedValue({ name: 'free', limits: { repos: 0, releasesPerMonth: 0 } });
    await expect(service.getMe('u1', {})).resolves.toMatchObject({ plan: 'free', status: null });
});

it('returns starter when trialing', async () => {
    betterAuth.api.listActiveSubscriptions.mockResolvedValue([{ status: 'trialing', plan: 'starter', periodEnd: new Date('2030-01-01'), stripeSubscriptionId: 'sub_1' }]);
    plans.findActiveByName.mockResolvedValue({ name: 'starter', limits: { repos: 1, releasesPerMonth: 10 } });
    await expect(service.getMe('u1', {})).resolves.toMatchObject({ plan: 'starter', status: 'trialing', stripeSubscriptionId: 'sub_1' });
});
```

- [ ] **Step 2: Implement service + controller (`@Session()`, `@Req()` for headers, `@ApiTags('subscriptions')`, `@ApiResource`)**

```typescript
@Get('plans')
@ApiResource({ operationId: 'listSubscriptionPlans', status: 200, response: SubscriptionPlansListResponseDto })
listPlans() { return this.subscriptionService.listPlans(); }

@Get('me')
@ApiResource({ operationId: 'getMySubscription', status: 200, response: SubscriptionMeResponseDto })
getMe(@Session() session: UserSession, @Req() req: Request) {
    return this.subscriptionService.getMe(session.user.id, req.headers);
}
```

- [ ] **Step 3: Module providers** — `SubscriptionPlanRepository`, `SubscriptionService`, `SubscriptionPlansSeed`, controller; import nothing extra if DatabaseModule is global

- [ ] **Step 4: `nx test shipshout-api-svc --testPathPattern=subscription` — PASS; commit**

```bash
git commit -m "feat(api): add subscriptions plans and me read endpoints"
```

---

### Task 5: Nest `payments` read API

**Files:**

- Replace stubs under `apps/shipshout-api-svc/src/app/payments/`
- Create: `stripe.constants.ts` (`STRIPE_CLIENT = Symbol('STRIPE_CLIENT')`)
- Create: `dto/payment-invoice.dto.ts`, `dto/payments-list-response.dto.ts`
- Rewrite: `payments.service.ts`, `payments.controller.ts`, `payments.module.ts`, specs

**Interfaces:**

- Consumes: `Stripe` client; session user `stripeCustomerId` from Better Auth session user (cast) **or** `betterAuth.api.getSession` / user fields after plugin
- Produces: `GET /payments/me` → `{ invoices: Array<{ id, amountDue, currency, status, createdAt, hostedInvoiceUrl }> }`
- If no `stripeCustomerId`: return `{ invoices: [] }`
- On Stripe API throw: Nest `BadGatewayException('Unable to load invoices')`

```typescript
async listMine(user: { id: string; stripeCustomerId?: string | null }): Promise<PaymentsListResponseDto> {
    if (!user.stripeCustomerId) return { invoices: [] };
    try {
        const list = await this.stripe.invoices.list({ customer: user.stripeCustomerId, limit: 12 });
        return {
            invoices: list.data.map((inv) => ({
                id: inv.id,
                amountDue: inv.amount_due,
                currency: inv.currency,
                status: inv.status,
                createdAt: new Date(inv.created * 1000).toISOString(),
                hostedInvoiceUrl: inv.hosted_invoice_url,
            })),
        };
    } catch {
        throw new BadGatewayException('Unable to load invoices');
    }
}
```

- [ ] **Step 1: Failing unit tests with mocked Stripe**
- [ ] **Step 2: Implement module `useFactory` for `STRIPE_CLIENT` from `ConfigService.getOrThrow('STRIPE_SECRET_KEY')`**
- [ ] **Step 3: Controller `@Get('me')` with `@Session()`; pass `session.user`**
- [ ] **Step 4: Tests pass; commit**

```bash
git commit -m "feat(api): add payments me invoice list endpoint"
```

---

### Task 6: Wire `AppModule` + `.env.example`

**Files:**

- Modify: `apps/shipshout-api-svc/src/app/app.module.ts`
- Modify: `.env.example`
- Optional helper: `apps/shipshout-api-svc/src/app/subscription/get-subscription-plans.ts`

**Interfaces:**

- `AuthModule.forRootAsync` useFactory returns:

```typescript
{
  // ...existing auth fields
  stripeSecretKey: configService.get<string>('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: configService.get<string>('STRIPE_WEBHOOK_SECRET'),
  getSubscriptionPlans: async () => {
    const pool = new Pool({ connectionString: configService.getOrThrow('DATABASE_URL') });
    try {
      const { rows } = await pool.query(
        `SELECT name, stripe_price_id AS "stripePriceId", stripe_annual_price_id AS "stripeAnnualPriceId", trial_days AS "trialDays", limits
         FROM subscription_plans WHERE is_active = true AND stripe_price_id IS NOT NULL`,
      );
      return rows;
    } finally {
      await pool.end();
    }
  },
}
```

Prefer a small shared Pool reused across calls if easy; ending per call is acceptable for v1.

- [ ] **Step 1: Wire factory + env example**

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_PRO=
```

- [ ] **Step 2: Copy local secrets from `shipshout_back/shipshout/.env` into developer `.env` (do not commit)**
- [ ] **Step 3: Boot API once; confirm no crash; commit**

```bash
git commit -m "feat(api): wire Stripe env and DB plan loader into AuthModule"
```

---

### Task 7: Regenerate OpenAPI client

**Files:**

- Regenerate via project scripts (`bun run openapi:generate` / serve OpenAPI then generate — follow existing `scripts/generate.script.ts` / README pattern used for repositories)
- Touch: `libs/api-client/src/lib/client/**`

- [ ] **Step 1: Ensure Swagger includes new operations (`listSubscriptionPlans`, `getMySubscription`, `listMyPayments` or generated names)**
- [ ] **Step 2: Regenerate `@shipshout/api-client`**
- [ ] **Step 3: Commit generated client**

```bash
git commit -m "chore(api-client): regenerate SDK for subscriptions and payments"
```

---

### Task 8: Dashboard Billing section

**Files:**

- Create: `apps/shipshout-client-dashboard/src/lib/billing/api.ts` — mirror `getRepositoriesApi()` for subscription/payment reads
- Create: `apps/shipshout-client-dashboard/src/lib/billing/actions.ts` — server actions for upgrade + portal via `authFetch` to Better Auth Stripe routes
- Create: `apps/shipshout-client-dashboard/src/components/settings/billing-section.tsx` — client or server component per DESIGN.md (hairline card like Account)
- Modify: `settings/page.tsx` — render Billing below Account
- Read: `DESIGN.md` before UI edits

**Interfaces:**

- `upgradeSubscriptionAction(plan: 'starter' | 'pro'): Promise<{ url: string } | { error: string }>`
    - `POST` `{getApiBaseUrl()}/auth-service/subscription/upgrade` with JSON `{ plan, successUrl, cancelUrl, disableRedirect: true, customerType: 'user' }`
    - `successUrl` / `cancelUrl`: `{CLIENT_APP_URL}/dashboard/settings?billing=success|cancelled`
    - Parse response for checkout `url`; on failure return `{ error }`
- `createBillingPortalAction(): Promise<{ url: string } | { error: string }>`
    - Call Better Auth portal endpoint (plugin: typically `POST /auth-service/subscription/billing-portal` or `authClient.subscription.billingPortal` — verify against installed `@better-auth/stripe` types/docs and use the real path/body: `{ returnUrl }`)
- Billing UI shows: current plan + status + limits; buttons Upgrade to Starter / Upgrade to Pro (hide current); Manage billing; note “Starter includes a one-time trial”; invoice list with link to `hostedInvoiceUrl`

- [ ] **Step 1: Implement api + actions**
- [ ] **Step 2: Implement `BillingSection` matching Settings Account card patterns (`bg.surface`, `border.hairline`, `borderRadius="lg"`)**
- [ ] **Step 3: Wire into settings page (server-fetch plans/me/payments, pass props; buttons as client island if needed)**
- [ ] **Step 4: Manual smoke in browser (test mode); commit**

```bash
git commit -m "feat(dashboard): add Settings Billing section for Stripe plans"
```

---

### Task 9: Manual verification checklist (no CI e2e)

- [ ] **Step 1: Stripe CLI**

```bash
stripe listen --forward-to localhost:8000/auth-service/stripe/webhook
```

Update `STRIPE_WEBHOOK_SECRET` to the CLI secret for local.

- [ ] **Step 2: Checklist**

1. New signup creates Stripe customer (Dashboard Customers).
2. Upgrade Starter → Checkout → webhook → `/subscriptions/me` shows `trialing`/`starter`.
3. Upgrade Pro → active pro; Starter trial not re-granted after prior trial.
4. Billing portal cancel → status updates via webhook.
5. `/payments/me` lists invoices after a payment.
6. Inactive plan in DB excluded from `/subscriptions/plans` and Checkout.

- [ ] **Step 3: Commit any doc tweaks only if needed; otherwise done**

---

## Spec coverage (self-review)

| Spec requirement | Task |
| ---------------- | ---- |
| DB `subscription_plans` + Free/Starter/Pro | 1–2 |
| Better Auth Stripe + dynamic plans + webhook | 3, 6 |
| Nest `/subscriptions/plans` + `/subscriptions/me` | 4 |
| Nest `/payments/me` | 5 |
| Env documentation / local keys from shipshout_back | 6 |
| Minimal Settings Billing UI | 8 |
| OpenAPI client for Nest reads | 7 |
| Manual Stripe CLI verification | 9 |
| No Nest write CRUD / no admin / no Growth / no org | Out of scope (not tasked) |
| Starter trial only | 2 seed + 3 plugin mapping |

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-11-stripe-billing-better-auth.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
**2. Inline Execution** — execute tasks in this session with executing-plans checkpoints  

Which approach?
