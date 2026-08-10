# Client Dashboard Auth Flow Design

**Date:** 2026-08-10  
**Status:** Approved for planning  
**App:** `shipshout-client-dashboard`  
**API:** `shipshout-api-svc` (`@shipshout/auth`)  
**Design system:** [`DESIGN.md`](../../../DESIGN.md)  
**Package manager:** bun

## Goal

Ship an authenticated client-dashboard experience: Chakra UI v3 auth pages themed from `DESIGN.md`, Next.js **server actions** calling Nest `/auth/*` (forwarding session cookies), social OAuth start, middleware session guard, logout, email verification page, dark mode, and Inter/NotionInter via `next/font`. Successful login/register lands on `/dashboard`.

## Decisions

| Topic | Choice |
| --- | --- |
| Pages (first pass) | Login, Register, Forgot + Reset, Google/GitHub (option C) |
| Post-auth landing | `/dashboard` |
| Styling | Chakra UI v3 themed from `DESIGN.md` |
| API access | Server actions → Nest (Approach 1); forward `Set-Cookie` into Next `cookies()` |
| Social | Browser navigate to `GET {API}/auth/google\|github` (not actions) |
| Session guard | Next middleware (cookie / session presence) |
| Logout | Dashboard control + server action (Nest logout wrapper or Better Auth sign-out) |
| Email verification | Dedicated page wired to verify-email flow |
| Dark mode | Chakra light + dark; default follow system |
| Fonts | `next/font` Inter (NotionInter alias / fallback until branded files exist) |
| Swagger | Remains on Nest API only; dashboard does not host Swagger |

## Architecture

```
Browser
  → /login|/register|/forgot-password|/reset-password|/verify-email  (auth shell)
  → /dashboard (+ logout)                                           (protected)
       forms → server actions → fetch SHIPSHOUT_API_URL/auth/*
            ← Set-Cookie forwarded via cookies().set
            → redirect('/dashboard') on success
  → social <a> → {API}/auth/google|github → Nest → provider → /auth-service callback

middleware.ts
  → no session + protected route → /login
  → session + auth route → /dashboard
```

Ownership:

- **Dashboard app** — Chakra theme, pages, actions, middleware, fonts
- **Nest `@shipshout/auth`** — existing register/login/forgot/reset/social; **add** thin logout (and session if needed for guard/verify UX)
- **`DESIGN.md`** — visual source of truth for tokens and component feel

## Routes

| Route | Auth | Notes |
| --- | --- | --- |
| `/` | public | Redirect: session → `/dashboard`, else → `/login` |
| `/login` | guest | login + password; social; links |
| `/register` | guest | name, username (+ availability), email, password; social |
| `/forgot-password` | guest | email → success copy (no enumeration) |
| `/reset-password` | guest | `?token=`; new password (+ confirm) |
| `/verify-email` | guest | token/query or “check your email” states |
| `/dashboard` | protected | Placeholder + logout |

## UI (Chakra + DESIGN.md)

- Auth shell: `canvas-soft` background, centered `surface` card (`rounded.lg`, hairline), Shipshout wordmark, `heading-2` titles, `body-sm` inputs (`text-input` tokens), primary pill CTA (`button-primary`), secondary links.
- Social: secondary/outline full-width buttons; hairline “or” divider.
- Dark mode: semantic tokens for canvas/surface/ink/primary; color mode from system by default.
- Typography: Inter via `next/font/google` (or local NotionInter when assets are added); map Chakra fonts to that family.

Do not invent a conflicting palette (no default purple AI chrome).

## Server actions & cookies

Actions (e.g. `src/lib/auth/actions.ts`):

- `loginAction`, `registerAction`, `forgotPasswordAction`, `resetPasswordAction`
- `checkUsernameAction` (register UX)
- `logoutAction`
- Optional `getSessionAction` / verify helpers as needed

Shared helpers:

- `authFetch(path, init)` — `SHIPSHOUT_API_URL` base, JSON, `credentials` as appropriate for server-side forward
- `applySetCookies(response)` — parse API `set-cookie` and set on the Next response cookie jar

Return shape for forms: `{ ok: false; error: string }` on failure; on login/register success apply cookies then `redirect('/dashboard')`.

**Env:**

- `SHIPSHOUT_API_URL` — server-only Nest base (e.g. `http://localhost:3000`)
- `NEXT_PUBLIC_SHIPSHOUT_API_URL` — public base for social `<a href>` (may match API URL in local/dev)

Cookie attribute alignment (path/domain/secure/sameSite) must work for local Next (e.g. `:4200`) talking to Nest (`:3000`); prefer rewriting cookie Domain empty / host-only on the Next response when forwarding.

## Middleware

- Protected: `/dashboard` (and future app routes under a shared matcher).
- Guest-only: `/login`, `/register`, `/forgot-password` (reset/verify may stay reachable with token).
- Session signal: presence of Better Auth session cookie name(s) after forward — document the cookie name once confirmed from Better Auth (typically `better-auth.session_token` or similar). If cookie-only is insufficient, add Nest `GET /auth/session` and call it from middleware sparingly or cache via cookie.

## Nest API gaps (this pass)

Dashboard needs capabilities not yet wrapped on Nest `/auth`:

1. **Logout** — add `POST /auth/logout` (or `sign-out`) wrapping Better Auth sign-out; clear cookies on both sides.
2. **Session (optional but recommended)** — `GET /auth/session` for middleware/dashboard “who am I”.
3. **Email verification** — page calls existing Better Auth verify path (`/auth-service/verify-email?...`) or a Nest proxy if we want a stable `/auth/verify-email` wrapper.

Keep Swagger annotations on any new Nest endpoints (API Swagger only).

## Components (dashboard)

| Piece | Role |
| --- | --- |
| Chakra `Provider` + theme | Tokens from `DESIGN.md` |
| Auth layout | Shared shell for guest routes |
| Form fields / alerts / buttons | Token-styled Chakra primitives |
| SocialButtons | Links to API Google/GitHub |
| Dashboard shell | Minimal placeholder + logout |

## Testing

- Unit: cookie forward helper; action error mapping (mock `fetch`)
- Manual: register → login → dashboard → logout; forgot/reset; social start redirect; middleware redirects; verify-email happy/sad; light/dark

## Non-goals

- Full product dashboard beyond placeholder + logout
- Hosting Swagger inside the Next app
- Resend/real email provider (API logging stub remains)
- Mobile-native apps

## Success criteria

- User can register, login (email or username), reset password, start Google/GitHub OAuth, verify email via the dedicated page, and logout
- Unauthenticated access to `/dashboard` redirects to `/login`
- UI matches `DESIGN.md` (incl. dark mode + Inter font wiring)
- Auth mutations go through server actions (social = browser navigation to API)
