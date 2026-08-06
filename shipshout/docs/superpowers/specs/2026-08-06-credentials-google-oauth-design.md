# Credentials & Google OAuth — Design Spec

**Date:** 2026-08-06  
**Status:** Approved (design)  
**Supersedes:** Login/signup constraints in `2026-08-06-web-app-revamp-design.md` (“Sign in with GitHub only, no email/password fields”)

---

## 1. Goal & Scope

Extend ShipShout’s existing session-based Passport auth to support **email/password credentials** and **Google OAuth**, while keeping GitHub login and the separate GitHub repo-connect flows unchanged. Users can link multiple sign-in methods to one account.

### In scope

| Area | Change |
|---|---|
| Data model | `user_identities` table; migrate `githubId` off `users`; add `emailVerifiedAt` |
| Auth tokens | `auth_tokens` for email verification and password reset |
| API | Register, login, verify, forgot/reset password, Google OAuth, identity link/unlink |
| Email | Platform-level Resend for verify + reset emails |
| Web | Login/signup with credentials + Google; forgot/reset/check-email pages; Connected accounts settings |
| Security | bcrypt passwords, rate limiting, signed link state, no email enumeration |

### Out of scope (v1)

| Area | Reason |
|---|---|
| Magic link / passwordless | Future enhancement |
| 2FA / MFA | Future enhancement |
| Sign in with Apple / other providers | Future enhancement |
| Redis session store | Recommended follow-up; not blocking |
| Auto-merge accounts by email without user action | Security risk |
| Team invites / org SSO | Separate feature |

### Decisions log

| Decision | Choice |
|---|---|
| Account model | One user, multiple linked sign-in methods |
| Architecture | `user_identities` table (not extending `users` in place) |
| Email/password verification | Required — hard block until verified (no session) |
| Password reset | Full forgot-password flow with email link in v1 |
| Google sign-in | Auto-create user + default workspace on first login (same as GitHub) |
| Session model | Keep `express-session` + `session.userId` (unchanged) |
| Auth emails | Platform `RESEND_API_KEY` (separate from workspace Resend keys for publishing) |
| Repo connect | Unchanged — `session.githubRepoConnect`, GitHub App/OAuth `state=repo:*` |
| Connected accounts UI | `[workspaceId]/settings/account` (identities are per-user; route follows existing settings layout) |

---

## 2. Current State

ShipShout today uses **GitHub-only login** via Passport (`passport-github2`) and `express-session`. First GitHub login auto-creates a user, default workspace, and owner membership. There is no signup page, no password storage, and `users.githubId` is required (non-null, unique).

GitHub appears again for **repository connect** (GitHub App install or OAuth with `state=repo:{workspaceId}` on the same callback URL). That flow is independent of user identity and must not be conflated with login.

**Key existing files:**

- `libs/auth/src/lib/services/auth.service.ts` — `upsertFromGithub()`
- `libs/auth/src/lib/strategies/github.strategy.ts`
- `apps/api/src/app/auth/controllers/auth.controller.ts` — `/auth/github`, `/auth/me`, `/auth/logout`
- `apps/api/src/app/repositories/controllers/github-oauth-callback.controller.ts` — login vs repo-connect branching
- `apps/web/src/components/auth/login-form.tsx` — GitHub button only

---

## 3. Data Model

### 3.1 `users` table (profile shell)

| Column | Change |
|---|---|
| `id` | unchanged (uuid PK) |
| `email` | nullable → **unique when set** (canonical profile email) |
| `emailVerifiedAt` | **new** — timestamp; null until verified |
| `name` | unchanged |
| `avatarUrl` | unchanged |
| `githubId` | **removed** — migrated to identities |
| `createdAt` | unchanged |

Profile fields (`name`, `avatarUrl`, `email`) may be updated from whichever provider the user signs in with most recently.

### 3.2 `user_identities` table (new)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid FK → `users` | |
| `provider` | enum | `github` \| `google` \| `credentials` |
| `providerUserId` | varchar | GitHub numeric ID, Google `sub`, or normalized email for credentials |
| `passwordHash` | varchar, nullable | bcrypt hash; only for `credentials` |
| `createdAt` | timestamp | |

**Constraints:**

- Unique on `(provider, providerUserId)` — one identity per provider account globally
- Unique on `(userId, provider)` — at most one link per provider per user

### 3.3 `auth_tokens` table (new)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid FK → `users` | |
| `type` | enum | `email_verify` \| `password_reset` |
| `tokenHash` | varchar | SHA-256 of raw token (never store plaintext) |
| `expiresAt` | timestamp | verify: 24h; reset: 1h |
| `usedAt` | timestamp, nullable | set on consumption |
| `createdAt` | timestamp | |

### 3.4 Migration strategy

1. Create `user_identities` and `auth_tokens` tables.
2. Backfill: for each existing user, insert `{ provider: 'github', providerUserId: githubId }`.
3. Set `emailVerifiedAt = createdAt` for all existing users (trusted via prior GitHub OAuth).
4. Drop `users.githubId` column.
5. Add unique index on `users.email` where email IS NOT NULL.

### 3.5 Bootstrap rules

| Method | Behavior |
|---|---|
| GitHub login | Find identity by `(github, githubId)` → sign in; else create user + identity + workspace + membership |
| Google login | Find identity by `(google, sub)` → sign in; else create user + identity + workspace + membership |
| Credentials sign-up | Create user (`emailVerifiedAt: null`) + credentials identity + workspace + membership → send verify email → **no session** |
| Credentials login | Reject with `403 EMAIL_NOT_VERIFIED` if `emailVerifiedAt` is null; else establish session |

Google and GitHub users get `emailVerifiedAt` set immediately when the provider reports a verified email (Google always; GitHub when email present in profile).

### 3.6 Linking rules

- Linking requires an active session.
- OAuth link uses signed `state=link:{token}` where token is HMAC-signed `{ userId, exp }` using `SESSION_SECRET`.
- Credentials link: authenticated user adds password to create a `credentials` identity (requires verified email on account).
- Cannot unlink the last remaining identity (`400 LAST_IDENTITY`).
- If OAuth identity is already tied to another user → `409 IDENTITY_TAKEN`.
- No silent auto-merge by email — user must explicitly link in Connected accounts.

---

## 4. API Routes & Auth Flows

Session model unchanged: successful auth sets `req.session.userId`. GitHub repo-connect continues to use `session.githubRepoConnect`.

### 4.1 Environment variables

| Variable | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | Default: `{API_BASE_URL}/api/auth/google/callback` |
| `RESEND_API_KEY` | Platform-level key for auth emails |
| `AUTH_EMAIL_FROM` | Sender, e.g. `ShipShout <auth@yourdomain.com>` |

Existing vars unchanged: `SESSION_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`, `WEB_BASE_URL`, `API_BASE_URL`.

### 4.2 Passport strategies

| Strategy | Package | Route trigger |
|---|---|---|
| `github` | `passport-github2` (existing) | `GET /auth/github` |
| `google` | `passport-google-oauth20` (new) | `GET /auth/google` |
| `local` | `passport-local` (new) | `POST /auth/login` |

Refactor `AuthService.upsertFromGithub()` → generic `upsertFromOAuth(provider, profile)` shared by GitHub and Google.

Shared helper: `establishSession(req, user)` sets `session.userId`.

### 4.3 Route table

**OAuth login**

| Method | Route | Behavior |
|---|---|---|
| `GET` | `/auth/github` | Passport redirect (login) |
| `GET` | `/auth/google` | Passport redirect (login) |
| `GET` | `/auth/google/callback` | Dedicated Google callback (not shared with repo connect) |
| `GET` | `/auth/github/callback` | Existing; `state=repo:*` → repo connect; else login via identities |

**Credentials**

| Method | Route | Behavior |
|---|---|---|
| `POST` | `/auth/register` | `{ email, password, name? }` → create user + send verify email → `201`, no session |
| `POST` | `/auth/login` | Passport local → session on success; `403` if unverified |
| `GET` | `/auth/verify-email?token=` | Validate token → set `emailVerifiedAt` → redirect `{WEB}/login?verified=1` |
| `POST` | `/auth/resend-verification` | `{ email }` → always `200` |
| `POST` | `/auth/forgot-password` | `{ email }` → send reset if credentials identity exists → always `200` |
| `POST` | `/auth/reset-password` | `{ token, password }` → update hash, invalidate token |

**Linking (authenticated)**

| Method | Route | Behavior |
|---|---|---|
| `GET` | `/auth/link/github` | OAuth with signed link state |
| `GET` | `/auth/link/google` | OAuth with signed link state |
| `POST` | `/auth/link/credentials` | `{ password }` → add credentials identity |
| `DELETE` | `/auth/link/:provider` | Unlink; blocked if last identity |
| `GET` | `/auth/identities` | List linked providers for current user |

**Unchanged**

| Method | Route |
|---|---|
| `GET` | `/auth/me` |
| `POST` | `/auth/logout` |

### 4.4 OAuth callback `state` handling

```
(no state / login)        → login/bootstrap via identities
state=repo:{workspaceId}  → repo connect (GitHub only, existing)
state=link:{signedToken}  → link identity to logged-in user (GitHub + Google)
```

### 4.5 Security

- Passwords: bcrypt, cost factor 12.
- Rate limiting: 5 req/min per IP on login, register, forgot-password, resend-verification.
- Validation: valid email format; password minimum 8 characters.
- Tokens: cryptographically random, stored as SHA-256 hash, single-use, expired tokens rejected.
- No email enumeration: forgot-password and resend-verification always return generic success.
- Link state: HMAC-signed, short expiry (10 minutes).

### 4.6 Error codes

| Code | HTTP | When |
|---|---|---|
| `EMAIL_NOT_VERIFIED` | 403 | Credentials login before verification |
| `EMAIL_EXISTS` | 409 | Register with email already in use |
| `IDENTITY_TAKEN` | 409 | OAuth account linked to another user |
| `LAST_IDENTITY` | 400 | Attempt to unlink only remaining method |
| `INVALID_TOKEN` | 400 | Expired or used verify/reset token |

### 4.7 Email templates (Resend)

1. **Verify email** — link to `{API}/auth/verify-email?token=…` (API validates, redirects to web login).
2. **Reset password** — link to `{WEB}/reset-password?token=…` (web form posts to API).

---

## 5. Web UI

Session consumption unchanged: `getSessionUser()` → `GET /auth/me`; dashboard layout redirects unauthenticated users to `/login`.

### 5.1 Pages

| Route | Purpose |
|---|---|
| `/login` | GitHub + Google OAuth buttons; email/password form; link to signup and forgot-password |
| `/signup` | Name, email, password; OAuth buttons; link to login |
| `/check-email` | Post-registration: “Check your email” + resend button |
| `/forgot-password` | Email input → generic confirmation |
| `/reset-password?token=` | New password form |
| `/[workspaceId]/settings/account` | Connected accounts: link/unlink providers, change/add password |

### 5.2 Login page layout

- OAuth buttons (GitHub, Google) at top.
- Divider (“or”).
- Email + password fields + Sign in.
- Links: Forgot password?, Don’t have an account? Sign up.

### 5.3 Sign-up flow

1. User submits register form.
2. API creates account, sends verification email.
3. Web redirects to `/check-email?email=…` (not dashboard).
4. User clicks verify link → API sets verified → redirect `/login?verified=1`.
5. User signs in → dashboard.

OAuth sign-up (GitHub/Google) skips check-email — auto-bootstrap on first login.

### 5.4 Connected accounts (`/[workspaceId]/settings/account`)

```
GitHub     ✓ Connected as @username    [Disconnect]
Google     Not connected                 [Connect]
Email      ✓ you@example.com             [Change password]
```

- Connect → redirect to `{API}/auth/link/{provider}`.
- Disconnect → `DELETE /auth/link/{provider}`; disabled if last identity.
- OAuth-only users can “Add password” via modal.
- After link callback → redirect back with success toast.

### 5.5 Visual consistency

Match existing Chakra UI patterns from `login-form.tsx`: brand OAuth buttons with provider icons, centered card (`maxW="md"`), divider with “or”.

---

## 6. Edge Cases

| Scenario | Behavior |
|---|---|
| Register email already used by GitHub user | `409 EMAIL_EXISTS`; UI suggests GitHub sign-in |
| Google login, email matches existing user | Separate accounts unless user explicitly links in Settings |
| Same Google/GitHub account, second login | Find identity → sign in (no duplicate) |
| Link provider already on another account | `409 IDENTITY_TAKEN` |
| Unlink last identity | Blocked |
| Forgot password for OAuth-only user | Silent success (no email sent) |
| Expired verify/reset token | Error with resend/forgot link |
| Migrated GitHub users | Identity backfilled; `emailVerifiedAt` set; no user action |

---

## 7. Testing

### Unit (`libs/auth`)

- Register, login validation, verify/reset token lifecycle.
- `upsertFromOAuth` for GitHub and Google (create + find existing).
- Link/unlink identity rules.
- bcrypt hash verification.

### API integration

- Register → verify → login happy path.
- Login blocked when unverified.
- Forgot → reset → login.
- Link/unlink with signed state.
- Rate limit enforcement.
- Last-identity unlink rejected.

### E2E

- Existing dashboard tests continue using `x-e2e-user` bypass.
- Auth flow tests with mocked Resend (capture outbound emails).
- OAuth strategies mocked — real OAuth in manual QA only.

### Manual QA checklist

- [ ] GitHub login regression (existing users)
- [ ] Google login creates workspace on first visit
- [ ] Email sign-up → verify → login
- [ ] Forgot/reset password end-to-end
- [ ] Link Google to existing GitHub account
- [ ] Repo connect unaffected (`state=repo:*`)

---

## 8. Rollout

1. Deploy migration + API (identities, new routes, refactored GitHub strategy).
2. Configure Google OAuth app + platform Resend + `AUTH_EMAIL_FROM`.
3. Deploy web (login/signup/account pages).
4. No feature flag — all methods available immediately alongside GitHub.

### Post-v1 follow-ups

- Redis-backed sessions via `connect-redis` + `REDIS_URL`.
- CSRF tokens on credential POST forms if needed.
- Account deletion flow.

---

## 9. File Touch Map (implementation reference)

| Layer | Files / areas |
|---|---|
| Database | `user.entity.ts`, new `user-identity.entity.ts`, `auth-token.entity.ts`, migration |
| Auth lib | `auth.service.ts`, `github.strategy.ts`, new `google.strategy.ts`, `local.strategy.ts`, repositories |
| API | `auth.controller.ts`, new callbacks, `auth.module.ts`, DTOs, rate limiter |
| Email | new `AuthMailService` using platform Resend |
| Web | `login-form.tsx`, new signup/forgot/reset/check-email pages, `/settings/account` |
| Config | `.env.example`, README auth section |
