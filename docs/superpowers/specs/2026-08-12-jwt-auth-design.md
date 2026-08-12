# JWT Auth Design (Replace Session Cookie with JWT + Refresh)

**Date:** 2026-08-12  
**Status:** Approved for planning  
**Library:** `@shipshout/auth`  
**Apps:** `shipshout-api-svc`, `shipshout-client-dashboard`  
**Package manager:** bun

## Goal

Replace client-facing Better Auth session cookies with JWT-based authentication using Better Auth's `jwt()` plugin. On sign-in, issue a short-lived access JWT (cookie + response body) and a long-lived httpOnly refresh cookie (Better Auth session token, server-only). Protected API routes validate the JWT via JWKS. Frontends store the access token from the response for `Authorization: Bearer` reuse.

## Decisions

| Topic | Choice |
| --- | --- |
| Auth model | JWT-only at the edge; Better Auth sessions internal only (Stripe, OAuth, refresh) |
| Approach | Nest JWT wrapper over Better Auth (Approach 1) |
| Access JWT TTL | 15 minutes |
| Refresh TTL | 7 days |
| Access transport | `auth_token` httpOnly cookie **and** `Authorization: Bearer` header |
| Refresh transport | `auth_refresh` httpOnly cookie only (never in JSON body) |
| JWT plugin | Better Auth `jwt()` with JWKS verification |
| Guard | Custom `JwtAuthGuard` + `@JwtUser()` replaces `@Session()` on protected controllers |
| Session cookie | Strip `better-auth.session_token` from all client-facing responses |

## Architecture

```
Sign-in (login / register / OAuth one-time-token verify)
  → Better Auth creates internal session (not forwarded to client)
  → AuthService calls BA /token → access JWT (15 min)
  → Response:
       Set-Cookie: auth_token=<jwt>        (httpOnly, sameSite=lax)
       Set-Cookie: auth_refresh=<session>  (httpOnly, maxAge=7d)
       Body: { user, accessToken: "<jwt>" }
       (better-auth.session_token stripped)

Authenticated API request
  → JwtAuthGuard reads auth_token cookie OR Authorization: Bearer <jwt>
  → Verify via JWKS (/auth-service/jwks)
  → Attach user claims to request (replaces @Session())

Token refresh
  → POST /auth/refresh (auth_refresh cookie)
  → BA validates session → new JWT
  → New auth_token cookie + { accessToken } body

Logout
  → BA signOut (invalidates session/refresh)
  → Clear auth_token + auth_refresh cookies
```

### Cookie names

| Cookie | Value | TTL | httpOnly |
| --- | --- | --- | --- |
| `auth_token` | JWT access token | 15 min | yes |
| `auth_refresh` | Better Auth session token | 7 days | yes |

Secure-prefixed variants (`__Secure-auth_token`, `__Secure-auth_refresh`) used when `useSecureCookies` is true (HTTPS).

## Better Auth config

Add `jwt()` plugin to `createAuth`:

```ts
jwt({
  jwt: {
    expirationTime: '15m',
    issuer: opts.baseUrl,
    audience: opts.baseUrl,
    definePayload: ({ user }) => ({
      sub: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
    }),
  },
})
```

- Run Better Auth migration for the `jwks` table.
- Sessions remain enabled internally for Stripe plugin, OAuth, and refresh backing.
- Do **not** add the Bearer plugin; clients authenticate with JWT, not session tokens.

## Components

| Piece | Responsibility |
| --- | --- |
| `AuthJwtUtils` | Issue tokens from BA session, set/clear JWT cookies, strip BA session cookies, extract/verify access JWT via JWKS |
| `JwtAuthGuard` | Nest guard: verify JWT from cookie or Bearer header |
| `@JwtUser()` | Parameter decorator: inject verified user claims from request |
| `AuthService` | All sign-in paths call shared `toAuthTokenResponse()`; new `refresh()` method |
| `AuthController` | Updated response shapes; new `POST /auth/refresh` |
| `AuthSessionResponseDto` | `{ user, accessToken }` replaces `{ user, session }` |
| `AuthRefreshResponseDto` | `{ accessToken }` |
| Dashboard `AuthTokenStore` | Hold access token for client-side Bearer requests |
| Dashboard `proxy.ts` | Check `auth_token` or `auth_refresh` for route guard |

### `AuthJwtUtils` methods

| Method | Purpose |
| --- | --- |
| `issueTokensFromSession(betterAuth, headers)` | After sign-in, call `api.getToken()` → `{ accessToken, refreshToken }` |
| `applyAuthTokens(res, tokens, opts)` | Set `auth_token` + `auth_refresh`; strip BA session cookies |
| `clearAuthTokens(res)` | Clear both cookies on logout |
| `extractAccessToken(req)` | Read from `auth_token` cookie or `Authorization: Bearer` |
| `verifyAccessToken(token, jwksUrl)` | JWKS verify via `jose`; return payload |

Cookie attributes reuse existing `cookieDomain`, `useSecureCookies`, `sameSite: lax`, `path: /`.

## Routes

| Method | Path | Change |
| --- | --- | --- |
| `POST` | `/auth/login` | Returns `{ user, accessToken }` + JWT cookies |
| `POST` | `/auth/register` | Same |
| `POST` | `/auth/one-time-token/verify` | Same (OAuth completion) |
| `POST` | `/auth/refresh` | **New** — refresh cookie → new JWT |
| `GET` | `/auth/session` | JWT-based; returns `{ user, accessToken? }` |
| `POST` | `/auth/logout` | Clears JWT + refresh cookies; BA signOut |
| `GET` | `/auth/oauth/bridge` | Unchanged (one-time token to dashboard) |
| Other `/auth/*` | Unchanged | Public or pre-auth flows |

Protected non-auth controllers (subscriptions, payments, repository) switch from `@Session()` to `@JwtUser()`.

## Data flow

### Register / login / one-time-token verify

1. Validate DTO → BA sign-up/sign-in/verify with `returnHeaders: true`.
2. Extract session token from BA response headers (internal use only).
3. Call BA `/token` with session → access JWT.
4. Set `auth_token` + `auth_refresh` cookies via `AuthJwtUtils.applyAuthTokens`.
5. Strip `better-auth.session_token` from forwarded cookies.
6. Return `{ user, accessToken }`.

### OAuth

1. Unchanged through provider callback and `/auth/oauth/bridge`.
2. Dashboard `/auth/callback` calls `POST /auth/one-time-token/verify`.
3. Same JWT issuance flow as login.

### Session check

1. Extract access JWT from cookie or Bearer header.
2. Verify via JWKS → return user from payload.
3. If access JWT expired but `auth_refresh` valid, optionally refresh inline or return `401` with client calling `/auth/refresh`.

### Refresh

1. Read `auth_refresh` cookie.
2. Call BA `getToken` / session validation with refresh token.
3. Issue new access JWT → set `auth_token` cookie + return `{ accessToken }`.

### Logout

1. BA `signOut` with refresh cookie.
2. `AuthJwtUtils.clearAuthTokens(res)`.

## Dashboard FE changes

### Cookie constants

Replace `SESSION_COOKIE_NAMES` with:

```ts
AUTH_TOKEN_COOKIE_NAMES = ['auth_token', '__Secure-auth_token']
AUTH_REFRESH_COOKIE_NAMES = ['auth_refresh', '__Secure-auth_refresh']
```

### Server actions

- After login/register/OAuth verify: apply cookies via `AuthCookieUtils`; read `accessToken` from JSON.
- Server actions continue using cookies (automatic `Cookie` header).

### Client token storage

- `AuthTokenStore`: hold `accessToken` in memory; optional `sessionStorage` fallback.
- Client-side fetch adds `Authorization: Bearer ${token}`.
- On `401`: call `POST /auth/refresh`, retry with new token.

### Middleware (`proxy.ts`)

- Treat request as authenticated if `auth_token` **or** `auth_refresh` is present.
- Expired access JWT with valid refresh → still pass middleware; session/refresh endpoints handle renewal.

## Error handling

| Case | Response |
| --- | --- |
| Invalid/expired access JWT, valid refresh | `401` on guarded routes; client calls `/auth/refresh` |
| Invalid/expired refresh | `401`; redirect to `/login` |
| Bad credentials | `401` (unchanged) |
| Email not verified | `302` redirect (unchanged) |
| Forgot-password | Always `{ ok: true }` (unchanged) |

## Security

- Both cookies httpOnly; refresh token never in JSON body.
- Strip `better-auth.session_token` from all client-facing `Set-Cookie` headers.
- JWKS cached in-memory in guard (keyed by `kid`).
- Logout invalidates BA session immediately (refresh cookie becomes useless).
- Cross-subdomain cookies use existing `AUTH_COOKIE_DOMAIN` config.
- JWT payload trimmed (`sub`, `email`, `name`, `username`) — no secrets in claims.

## Out of scope

- Mobile-native refresh token in response body.
- JWT denylist / forced revocation beyond session invalidation.
- Changing Better Auth `basePath` (`/auth-service`).
- Non-browser API clients (can use Bearer from login response without cookie changes).

## Testing

| Area | Tests |
| --- | --- |
| `AuthJwtUtils` | Cookie set/strip, token extract, JWKS verify (mocked) |
| `AuthService` | login/register/OAuth/refresh/logout return JWT shape |
| `JwtAuthGuard` | Cookie auth, Bearer auth, expired, missing |
| `AuthController` | `/auth/refresh` endpoint, cookie headers |
| Dashboard | Cookie constant update, middleware presence check |
| Migration | `jwks` table exists after BA migrate |

## Success criteria

- Register/login/OAuth verify return `{ user, accessToken }` with `auth_token` + `auth_refresh` cookies; no `better-auth.session_token` exposed.
- Protected routes accept JWT via cookie or Bearer; reject invalid/expired tokens with `401`.
- `POST /auth/refresh` issues new access JWT when refresh cookie is valid.
- Logout clears cookies and invalidates refresh.
- Dashboard middleware and server actions work with new cookie names.
- Client-side API calls can use Bearer token from login response body.
