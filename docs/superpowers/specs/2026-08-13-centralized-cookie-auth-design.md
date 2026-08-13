# Centralized cookie auth for dashboard API calls

> **Superseded in part by** [`2026-08-13-dashboard-api-client-factory-design.md`](./2026-08-13-dashboard-api-client-factory-design.md) — `ShipshoutApi` / `ShipshoutApiUtils` replaced by `DashboardApiClient` factory with request interceptor.

## Summary

Consolidate authenticated API transport in the client dashboard so all server-side requests share one cookie-based auth path. Keep `libs/api-client/src/hey-api.config.ts` for static hey-api defaults only (`baseUrl`, `cache`, `responseStyle`, `throwOnError`). Do not use hey-api runtime config or `auth` for JWT — the API already accepts JWT from httpOnly cookies, and request-scoped auth belongs in the Next.js dashboard layer.

## Problem

Auth headers are built in three places today:

- `lib/auth/api.ts` — `authFetch` (auth actions)
- `lib/shipshout-api.ts` — `ShipshoutApiUtils.requestHeaders` (SDK + `shipshoutFetch`)
- `lib/billing/api.ts` — duplicate cookie/header logic

This duplication is easy to drift (billing already diverged) and was the motivation for putting runtime config in the dashboard app. Moving hey-api config into `libs/api-client` fixed import/circular dependency issues but cannot read Next.js `cookies()` — auth must stay dashboard-local.

## Decision

**Approach:** Extend `ShipshoutApiUtils` as the single authenticated transport layer.

**Not doing:**

- Bearer `Authorization` headers (API supports them, but cookies are the current model)
- hey-api `auth` option (OpenAPI spec has no security schemes; would not auto-attach anyway)
- Request-scoped auth in `hey-api.config.ts` (runs at module init; no access to `cookies()`)
- Client-side `AuthTokenStore` (unused; out of scope)

## Architecture

```
Server Components / Server Actions / Route Handlers
        │                              │
        ▼                              ▼
   authFetch (alias)         ApiClient + requestOptions
        │                              │
        └──────────► ShipshoutApiUtils ◄─┘
                       │
              buildRequestHeaders()
                - Cookie (all cookies, incl. auth_token)
                - origin / referer (Better Auth originCheck)
              fetch() / getApiClientOptions()
                       │
                       ▼
                Shipshout API (JWT from cookie)
```

### Boundaries

| Layer | Responsibility |
|---|---|
| `hey-api.config.ts` | Static client defaults only |
| `ShipshoutApiUtils` | Request-scoped cookie auth for all dashboard API calls |
| `authFetch` | Stable import for auth actions; delegates to `ShipshoutApiUtils` |
| `AuthCookieUtils` | Apply/clear Set-Cookie from login, refresh, logout responses |
| `refreshAccessTokenAction` | 401 retry — unchanged, caller-initiated |

## API

### `ShipshoutApiUtils` (extended)

| Method | Responsibility |
|---|---|
| `buildRequestHeaders(init?)` | Async. Reads `cookies()`, builds `Cookie`, `origin`, `referer`. Merges optional extra headers (e.g. `content-type: application/json`). |
| `fetch(path, init?)` | Authenticated fetch to `SHIPSHOUT_API_URL + path`. Uses `buildRequestHeaders`, `cache: 'no-store'`. Returns raw `Response`. |
| `fetchJson<T>(path, init?)` | Wraps `fetch` + JSON parse for typed helpers like `shipshoutFetch`. |
| `getApiClientOptions()` | Hey-api SDK options — calls `buildRequestHeaders` internally. |
| `getApiClient()` | Returns `{ api: new ApiClient(), requestOptions }`. |

### `authFetch`

Thin alias: `ShipshoutApiUtils.fetch(path, init)` with default `content-type: application/json` for auth JSON endpoints.

## Data flow

### SDK call (Server Component)

1. Page calls `ShipshoutApiUtils.getApiClient()`
2. `buildRequestHeaders()` reads current request cookies
3. SDK call: `api.listLinkedRepos(requestOptions)`
4. API `JwtAuthGuard` extracts JWT from `auth_token` cookie

### 401 retry (existing pattern, preserved)

1. Request returns 401
2. Caller invokes `refreshAccessTokenAction()`
3. `AuthCookieUtils.applyToCookieStore` applies new tokens
4. Retry with fresh `getApiClientOptions()`

Callers remain responsible for retry — no global interceptor (avoids hidden refresh on auth endpoints like login).

## Migration

| File | Change |
|---|---|
| `lib/shipshout-api.ts` | Add `buildRequestHeaders`, `fetch`; refactor `shipshoutFetch` to use them |
| `lib/auth/api.ts` | `authFetch` delegates to `ShipshoutApiUtils.fetch` |
| `lib/billing/api.ts` | Remove duplicate cookie logic; use `ShipshoutApiUtils.getApiClient()` |

**Unchanged:** `AuthCookieUtils`, `refreshAccessTokenAction`, `fetchWithAuthRetry` in channels (uses centralized fetch underneath), `hey-api.config.ts`.

## Error handling

- Missing `SHIPSHOUT_API_URL` → throw at request time
- Empty cookie store → omit `Cookie` header (unauthenticated endpoints still work)
- 401 on protected routes → caller handles refresh retry
- JSON parse failures in `shipshoutFetch` → return `{ error, status }`

## Testing

1. Unit test `ShipshoutApiUtils.buildRequestHeaders` — mock `cookies()` to verify Cookie/origin/referer output
2. Manual smoke: login → dashboard load → billing page load
3. Regression: billing page (previously duplicated header path)
