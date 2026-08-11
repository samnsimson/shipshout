# Verify Email Flow Design

**Date:** 2026-08-10  
**Status:** Approved  
**Apps:** `shipshout-client-dashboard`, `shipshout-api-svc` (`@shipshout/auth`)  
**Related:** [`2026-08-10-client-dashboard-auth-design.md`](./2026-08-10-client-dashboard-auth-design.md)  
**Design system:** [`DESIGN.md`](../../../DESIGN.md)  
**Package manager:** bun

## Goal

Complete end-to-end email verification: Nest sends verification mail (via existing `EmailAdapter`), dashboard owns the post-register “check inbox” experience and token confirmation UI, Nest wraps Better Auth for verify + resend. After verify, user is prompted to log in (no auto session).

## Decisions

| Topic                   | Choice                                                        |
| ----------------------- | ------------------------------------------------------------- |
| Post-register landing   | Redirect to `/verify-email?email=…` (Approach A)              |
| Resend                  | Yes — email field + resend; Nest always `{ ok: true }`        |
| After successful verify | Success UI + primary CTA to `/login` (no auto sign-in)        |
| Architecture            | Nest wrappers; Nest calls Better Auth internally              |
| Email transport         | Existing console/`EmailAdapter` stub (same as password reset) |
| Verification link host  | Client dashboard URL (`CLIENT_APP_URL`), not API `baseURL`    |

## Architecture

```
Register (Nest signUpEmail)
  → BA triggers emailVerification.sendVerificationEmail
  → EmailAdapter sends link: {CLIENT_APP_URL}/verify-email?token=…
  → Dashboard registerAction redirects → /verify-email?email=…

/verify-email (no token)
  → Check inbox copy + optional prefilled email + Resend form
  → resendVerificationAction → POST /auth/resend-verification
       → Nest → betterAuth.api.sendVerificationEmail

/verify-email?token=…
  → Server page → POST /auth/verify-email { token }
       → Nest → betterAuth.api.verifyEmail
  → Success / error Alert + Log in CTA
```

Ownership:

- **`@shipshout/auth`** — `emailVerification` config; `POST /auth/verify-email`; `POST /auth/resend-verification`; Swagger
- **Dashboard** — `/verify-email` states, register redirect, `resendVerificationAction`, Nest-backed verify (no direct `/auth-service` calls)
- **Env** — `CLIENT_APP_URL` for link rewriting (e.g. `http://localhost:3000`)

## Nest API

### Config (`auth.config.ts`)

- Add `emailVerification.sendVerificationEmail` → `AuthUtils.sendVerificationEmail` (parallel to reset).
- Rewrite outbound link to `${CLIENT_APP_URL}/verify-email?token=${token}` (use `token` from BA callback; ignore BA’s default API-hosted `url` for the href).
- Set `autoSignInAfterVerification: false` (or omit; do not enable).
- Keep `emailAndPassword.requireEmailVerification: true`.

### Endpoints

| Method / path                    | Body                | Behavior                                                                                                                                                                                                   |
| -------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/verify-email`        | `{ token: string }` | Call `betterAuth.api.verifyEmail`; map errors via `AuthUtils.mapAuthError`; return `{ ok: true }` on success. Do not forward session cookies (no auto sign-in).                                            |
| `POST /auth/resend-verification` | `{ email: string }` | Call `betterAuth.api.sendVerificationEmail` with `callbackURL` pointing at dashboard verify page if required by BA; **always** return `{ ok: true }` to the client (swallow not-found / already-verified). |

DTOs + Swagger annotations required. Pass **plain objects** into Better Auth (not Nest DTO class instances).

### Env

| Variable                                       | Example                 | Used by                  |
| ---------------------------------------------- | ----------------------- | ------------------------ |
| `CLIENT_APP_URL`                               | `http://localhost:3000` | Auth config link rewrite |
| Existing `BETTER_AUTH_*` / `SHIPSHOUT_API_URL` | unchanged               | API + dashboard          |

Document in `.env.example`. Pass `clientAppUrl` through Nest auth module options if other secrets are already injected that way.

## Dashboard

### Register

- On successful `POST /auth/register`: **do not** `redirect('/dashboard')`.
- If response has no usable session token (expected when verification required): do **not** apply session cookies; `redirect('/verify-email?email=' + encodeURIComponent(email))`.
- If a session token is unexpectedly present: keep current cookie apply + dashboard redirect (defensive; rare with `requireEmailVerification`).

### `/verify-email` page

States (single route, `AuthCard` + `DESIGN.md` tokens):

1. **Awaiting** (no `token`): “Check your inbox…”; email input (prefill from `?email=`); Resend button; link to login.
2. **Verified** (`token` present, Nest ok): success alert + **Log in** CTA.
3. **Failed** (`token` present, Nest error): error alert (invalid/expired) + resend affordance + login link.

Verify runs server-side on the page (or a small helper) against Nest `POST /auth/verify-email`, not `GET /auth-service/verify-email`.

### Actions

- `resendVerificationAction(formData)` → `POST /auth/resend-verification`; return `{ ok: true }` / surface transport errors only.
- Optional shared helper for verify used by the page.

### Proxy / middleware

- `/verify-email` remains reachable for guests (with or without token).
- Do **not** add `/verify-email` to guest-only “session → bounce to dashboard” list (users with a stale cookie must still open the link). Current matcher already excludes it — keep that.

## UI

Follow `DESIGN.md` / existing auth components (`AuthCard`, `AuthInput`, primary pill CTA, muted body copy). No new visual language. Resend success: non-enumerating confirmation (“If an account exists, we sent a link”).

## Testing

- Nest unit: verify/resend service methods call BA APIs with plain payloads; resend always `{ ok: true }` even when BA throws “user not found” / already verified.
- Nest unit: `sendVerificationEmail` adapter builds dashboard URL with token.
- Manual: register → check console email link → open `/verify-email?token=` → success → login works; resend from awaiting state; bad token shows error.

## Non-goals

- Real email provider / Resend.com
- Auto sign-in after verification
- Changing `requireEmailVerification` to false
- Dedicated `/check-email` route (use `/verify-email` without token)

## Success criteria

- Register lands on `/verify-email` with check-inbox + resend
- Verification email link opens dashboard `/verify-email?token=…` and confirms via Nest → BA
- Success path offers login only (no session cookie from verify)
- Resend never reveals whether the email exists
- UI matches existing auth shell / `DESIGN.md`
