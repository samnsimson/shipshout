# Stripe Billing via Better Auth Design

**Date:** 2026-08-11  
**Status:** Approved for planning  
**Apps / libs:** `shipshout-api-svc`, `shipshout-client-dashboard`, `@shipshout/auth`, `@shipshout/database`  
**Package manager:** bun  
**Reference:** [Better Auth Stripe plugin](https://better-auth.com/docs/plugins/stripe)

## Goal

Complete the Nest `payments` and `subscription` modules as thin, authenticated read APIs over Stripe + Better Auth Stripe (not Nest-owned Stripe lifecycle). Wire `@better-auth/stripe` for customers, Checkout, Customer Portal, and webhooks. Store subscription plans in the app DB so future admin modules can change catalog/limits without redeploying auth config. Ship a minimal Settings/Billing page on the client dashboard.

## Decisions

| Topic | Choice |
| ----- | ------ |
| Approach | Better Auth Stripe as billing spine; Nest read-only billing APIs |
| Billing subject | Per user now; keep a clear path to org/`referenceId` later |
| Plans | Free (default) + Starter + Pro; Growth deferred |
| Plan source | DB table `subscription_plans` + dynamic Better Auth `plans` loader |
| Trial | Starter only (e.g. 14 days); Pro none; one trial per account (plugin) |
| Client UI | Minimal Billing in Settings (current plan, upgrade, portal, recent invoices) |
| Nest “CRUD” | Read endpoints only; writes via Better Auth Stripe client/server |
| Secrets | Copy Stripe keys/price IDs from `shipshout_back` into local env; document names in `.env.example` only |

## Architecture

```
Dashboard (Settings / Billing)
  → authClient.subscription.upgrade | billingPortal   (writes)
  → GET /subscriptions/me | /subscriptions/plans
  → GET /payments/me                                 (reads)

Nest subscription / payments modules
  → TypeORM subscription_plans (catalog)
  → Better Auth / Stripe customer + subscription state (plugin schema)
  → Stripe SDK (invoice list only)

Better Auth basePath /auth-service
  → stripe plugin (customer on signup, Checkout, portal, webhooks)
  → POST /auth-service/stripe/webhook
```

Stripe remains source of truth for charges and subscription status. The plugin syncs subscription linkage into Better Auth tables. Nest does not implement a second webhook handler.

## Components

### Plan catalog (`@shipshout/database` + Nest)

Entity / table `subscription_plans`:

| Column | Notes |
| ------ | ----- |
| `id` | UUID PK |
| `name` | Slug: `free` \| `starter` \| `pro` (unique) |
| `displayName` | UI label |
| `stripePriceId` | Nullable; null for Free |
| `stripeAnnualPriceId` | Optional, nullable |
| `trialDays` | Nullable; Starter seeded with 14, Pro/Free null |
| `limits` | JSON (e.g. repos, releasesPerMonth) |
| `isActive` | Soft-hide from catalog and plugin loader |
| `sortOrder` | Display order |
| timestamps | `createdAt` / `updatedAt` |

Seed on migrate/seed:

- **free** — no Stripe price; limits `{ repos: 0, releasesPerMonth: 0 }` until product defines a free tier (catalog row exists so admin can edit later)
- **starter** — `STRIPE_PRICE_STARTER`; trial 14 days; `{ repos: 1, releasesPerMonth: 10 }`
- **pro** — `STRIPE_PRICE_PRO`; no trial; `{ repos: 3, releasesPerMonth: null }` (null = unlimited)

Admin plan CRUD APIs/UI are out of scope; schema is admin-ready.

### Auth (`libs/auth`)

- Install `@better-auth/stripe` + `stripe` (server).
- Extend `createAuth` with `stripe({ stripeClient, stripeWebhookSecret, createCustomerOnSignUp: true, subscription: { enabled: true, plans: async () => ... } })`.
- Dynamic `plans` loader: active rows with non-null `stripePriceId` → `{ name, priceId, freeTrial?: { days }, limits }`.
- Plan loader reads `subscription_plans` via a small injectable callback or shared `pg` query on the app DB (public schema), not the Better Auth `auth` search_path pool alone — pass `getSubscriptionPlans` into `AuthOptions` so Nest/TypeORM or a one-off query can supply rows without coupling auth to TypeORM entities.
- Extend `AuthOptions` / env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and price IDs used by seed (not hardcoded plan definitions in auth config).
- Run Better Auth migrate/generate for plugin schema (customer/subscription fields/tables in `auth` search_path).
- Webhook URL: `{BETTER_AUTH_BASE_URL}/auth-service/stripe/webhook` (events: `checkout.session.completed`, `customer.subscription.created|updated|deleted` at minimum).

### Nest `subscription` module

| Method | Path | Behavior |
| ------ | ---- | -------- |
| GET | `/subscriptions/plans` | Auth-gated; active plans from DB |
| GET | `/subscriptions/me` | Session user → `{ plan, status, periodEnd, stripeSubscriptionId?, limits }` where `plan` is `free` if no active/trialing subscription |

Remove stub create/update/delete that imply Nest owns subscription writes. Response DTOs replace empty `entities/subscription.entity` stubs (no TypeORM subscription entity as Stripe SoT).

### Nest `payments` module

| Method | Path | Behavior |
| ------ | ---- | -------- |
| GET | `/payments/me` | Recent invoices for the user’s Stripe customer via Stripe SDK |

No Nest create-charge / refund endpoints in v1. Drop empty TypeORM `Payment` entity stub; use response DTOs.

### Dashboard

- Add `stripeClient({ subscription: true })` to the auth client.
- Minimal Billing section on Settings: current plan + limits, upgrade CTAs (Starter/Pro), manage via Customer Portal, short invoice list from Nest.
- Checkout `successUrl` / `cancelUrl` → dashboard settings (with optional query flag).
- Follow `DESIGN.md` for UI tokens/patterns.

### Configuration

Document in `.env.example` (values empty):

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PRO`

Local/dev: copy values from `shipshout_back` `.env` (never commit secrets). `STRIPE_PRICE_GROWTH` remains unused until a later plan row is added.

## Data flow

1. **Signup** → plugin creates Stripe customer and links it to the user.
2. **View billing** → Nest reads plan catalog + current subscription + invoices.
3. **Upgrade** → `authClient.subscription.upgrade({ plan, successUrl, cancelUrl, customerType: 'user' })` → Checkout → webhook → plugin subscription state.
4. **Manage / cancel** → Customer Portal → webhooks keep status in sync.
5. **Future admin edits** → update `subscription_plans`; plugin loader and `GET /subscriptions/plans` reflect changes. Existing Stripe subscriptions keep their Stripe price until the customer changes plan.

**Org billing later:** same flows with `customerType: 'organization'` and `referenceId`; Nest gains an org-scoped read variant; plans table unchanged.

## Error handling

- Unauthenticated Nest billing routes → 401.
- No subscription / no customer → treat as Free; empty invoice list (lazy customer creation on first upgrade via plugin).
- Missing Stripe env in non-test bootstrap → fail fast.
- Inactive plan → excluded from plugin loader and public catalog; upgrade to inactive slug fails at plugin; surface error on billing UI.
- Stripe invoice API failure → Nest 502/503 with safe message; UI empty list + retry.
- Webhook signature failures → handled only by the plugin (no duplicate Nest webhook).
- Trial abuse → plugin one-trial-per-account; UI copy notes this.

## Testing

- Unit: plan → Better Auth plan mapper; `/me` Free vs active/trialing; payments invoice mapping with mocked Stripe.
- Auth: plugin registration with mocked dynamic plans loader.
- Controllers: 401 without session; 200 response shapes.
- No live Stripe e2e in CI. Manual: Stripe CLI webhook, Starter Checkout (trial), Pro upgrade, portal cancel.

## Out of scope

- Admin plan CRUD UI/APIs
- Growth plan row/product
- Organization/workspace billing (path only)
- Enforcing repo/release limits in product features (store limits now; enforce later)
- Nest TypeORM payment/subscription entities as source of truth
- Annual pricing UI (column optional; not required for v1 Checkout)

## Success criteria

- Better Auth Stripe plugin live with DB-backed Starter/Pro plans and Starter trial.
- Authenticated Nest endpoints return current subscription, plan catalog, and recent invoices.
- Settings Billing page can upgrade and open the portal end-to-end against Stripe test mode.
- Env documented; secrets not committed; path to org billing and admin plan edits is obvious in schema/API split.
