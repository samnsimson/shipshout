# Replace ShipshoutApi with DashboardApiClient factory

## Summary

Remove `ShipshoutApi` as a parallel HTTP transport layer in the client dashboard. Replace it with `DashboardApiClient`, a small factory that returns a configured `ApiClient` with a request interceptor injecting per-request cookie auth headers. All server-side API calls use generated `ApiClient` methods only.

## Problem

The dashboard currently has two HTTP layers:

- **`ApiClient`** — generated from OpenAPI; typed endpoints and responses
- **`ShipshoutApi`** — dashboard-local wrapper with `fetch`, `fetchJson`, `getApiClientOptions`, and cookie header building

This split is confusing: developers must choose between raw fetch and generated methods. Recent refactors moved most call sites to `ApiClient`, but `ShipshoutApi` remains as boilerplate (`getClient()` + spread `requestOptions`) and as an escape hatch for billing and SSE.

`ApiClient` cannot replace cookie auth on its own — `hey-api.config.ts` runs at module init and cannot call Next.js `cookies()`. The fix is not to keep a second HTTP client, but to inject auth into `ApiClient` via a per-request factory.

## Decision

**Approach:** `DashboardApiClient` factory with request interceptor (Approach 1).

**Not doing:**

- Bearer `Authorization` headers (cookies remain the auth model)
- Global 401 refresh interceptor (callers keep explicit retry to avoid breaking auth endpoints)
- Request-scoped config in `hey-api.config.ts` (still static defaults only)
- Permanent raw `fetch()` shortcuts for endpoints that belong in OpenAPI

## Architecture

```
Server Components / Server Actions / Route Handlers
        │
        ▼
   *.actions.ts  (form validation, redirect, revalidatePath)
        │
        ▼
   *.api.ts  (domain wrapper — one generated method per call)
        │
        ▼
   DashboardApiClient.get()
        │  request interceptor:
        │    Cookie (all request cookies)
        │    origin + referer (Better Auth originCheck)
        ▼
   ApiClient.<generatedMethod>()
        │
        ▼
   Shipshout API (JWT from auth_token cookie)
```

### Boundaries

| Layer | Responsibility |
|---|---|
| `hey-api.config.ts` | Static client defaults: `baseUrl`, `cache`, `responseStyle`, `throwOnError` |
| `DashboardApiClient` | Per-request factory; cookie auth via interceptor |
| `*.api.ts` | Thin wrappers: `return (await DashboardApiClient.get()).listShoutouts()` |
| `*.actions.ts` | Server action orchestration only |
| `AuthUtils` | Set-Cookie apply/clear; session user normalization |

## API

### `DashboardApiClient`

| Method | Responsibility |
|---|---|
| `get()` | Async. Creates hey-api `Client` with request interceptor, returns `new ApiClient({ client })`. Called once per server request context. |
| `buildRequestHeaders(initHeaders?)` | Async. Reads `cookies()`, builds `Cookie`, `origin`, `referer`. Used by interceptor; exposed for unit tests. |

### `ApiErrorUtils`

| Method | Responsibility |
|---|---|
| `message(error, fallback)` | Extract Nest-style `{ message }` from hey-api error objects. Replaces `ShipshoutApi.errorMessage`. |

### Domain `*.api.ts` pattern

```typescript
static async fetchAll() {
  const api = await ShoutoutsApi.getClient();
  return api.listShoutouts();
}

private static getClient() {
  return DashboardApiClient.get();
}
```

No `requestOptions` spread at call sites — interceptor handles headers.

## Data flow

### Typical SDK call (Server Component)

1. Page calls `ShoutoutsApi.fetchAll()`
2. `DashboardApiClient.get()` builds client with interceptor
3. Interceptor reads current request cookies and merges auth headers
4. `api.listShoutouts()` executes
5. API `JwtAuthGuard` extracts JWT from `auth_token` cookie

### Auth endpoints (Set-Cookie)

1. `AuthApi.login(...)` calls `api.authControllerLogin({ body, redirect: 'manual' })`
2. Read `result.response` for redirect status or Set-Cookie headers
3. `AuthUtils.applyToCookieStore(result.response)` on success

Login is the only call that passes `redirect: 'manual'`.

### 401 retry (unchanged)

1. Request returns 401
2. Caller invokes `AuthActions.refreshAccessToken()`
3. `AuthUtils.applyToCookieStore` applies new tokens
4. Retry with fresh `DashboardApiClient.get()` (new interceptor reads updated cookies)

No global refresh interceptor.

### SSE shoutout events

Replace raw fetch in `app/api/shoutouts/[id]/events/route.ts`:

```typescript
const api = await DashboardApiClient.get();
const result = await api.shoutoutControllerStreamEvents({
  path: { id },
  parseAs: 'stream',
});
return new Response(result.data, { headers: { ... } });
```

### Billing Stripe routes

Add Better Auth Stripe endpoints to the Nest OpenAPI spec:

- `POST /auth-service/subscription/upgrade`
- `POST /auth-service/subscription/billing-portal`

Regenerate client (`bun run openapi:generate`), then migrate `BillingApi` to generated methods. Remove `ShipshoutApi.fetch` usage in billing.

## Migration

| File | Change |
|---|---|
| `src/lib/api/dashboard-api-client.ts` | **New** — factory + interceptor |
| `src/lib/api/api-error.utils.ts` | **New** — `ApiErrorUtils.message` |
| `src/lib/shipshout.api.ts` | **Delete** |
| `src/lib/*/*.api.ts` | Use `DashboardApiClient.get()`; remove `requestOptions` spread |
| `src/lib/*/*.actions.ts` | Replace `ShipshoutApi.errorMessage` with `ApiErrorUtils.message` |
| `src/app/api/shoutouts/[id]/events/route.ts` | Use `shoutoutControllerStreamEvents` with `parseAs: 'stream'` |
| `src/lib/billing/billing.api.ts` | Generated methods after OpenAPI update |
| `specs/shipshout-api.spec.ts` | Rename → `dashboard-api-client.spec.ts`; test `buildRequestHeaders` |
| `.cursor/rules/dashboard-api-client.mdc` | Update layering table (remove `ShipshoutApi`) |
| `docs/superpowers/specs/2026-08-13-centralized-cookie-auth-design.md` | Add deprecation note pointing to this spec |

## Error handling

- Missing `SHIPSHOUT_API_URL` → throw at `DashboardApiClient.get()` time
- Empty cookie store → omit `Cookie` header (public endpoints still work)
- 401 on protected routes → caller handles refresh retry
- hey-api `throwOnError: false` preserved — callers check `result.error` and `result.response?.ok`

## Testing

1. Unit test `DashboardApiClient.buildRequestHeaders` — mock `cookies()`; verify Cookie/origin/referer
2. Unit test interceptor merges headers into outgoing request
3. Jest regression: auth-cookies spec unchanged
4. Manual smoke: login → dashboard → repositories → shoutout SSE → billing settings

## OpenAPI follow-up

Billing Stripe routes must be added to the Nest OpenAPI spec before billing migration is complete. Until then, billing may temporarily keep raw fetch behind `DashboardApiClient` using the underlying hey-api client's generic `request()` — not a permanent pattern.
