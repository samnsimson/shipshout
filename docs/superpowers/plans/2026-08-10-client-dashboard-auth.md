# Client Dashboard Auth Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Chakra-themed auth pages in `shipshout-client-dashboard` that call Nest `/auth/*` via server actions (cookie forward), plus middleware guard, logout, verify-email, dark mode, and Inter fonts — landing on `/dashboard` after login/register.

**Architecture:** Extend Nest auth with `session` + `logout` (+ verify-email proxy if needed). Dashboard uses Chakra v3 theme from `DESIGN.md`, server actions (`authFetch` + `applySetCookies`), guest `(auth)` routes, protected `/dashboard`, and middleware that checks `better-auth.session_token`. Social uses public API links.

**Tech Stack:** Next.js 16 App Router, React 19, Chakra UI v3 (`@chakra-ui/react`, `@emotion/react`), NestJS `@shipshout/auth`, Better Auth, bun, Jest

## Global Constraints

- Read and follow root `DESIGN.md` before any UI (no purple/default AI chrome).
- Auth mutations via **server actions**; social = browser `GET` to Nest `/auth/google|github`.
- Post-auth redirect: `/dashboard`.
- Cookie name: `better-auth.session_token` (prefix `better-auth`, name `session_token`; production may use `__Secure-` prefix — handle both in middleware).
- Env: `SHIPSHOUT_API_URL` (server), `NEXT_PUBLIC_SHIPSHOUT_API_URL` (social links).
- Swagger only on Nest; do not add Swagger to the Next app.
- bun + Nx; Prettier 4-space, single quotes, printWidth 160; one-line single-statement `if`s.
- Spec: `docs/superpowers/specs/2026-08-10-client-dashboard-auth-design.md`.

## File map

| File | Responsibility |
| --- | --- |
| `libs/auth/.../auth.service.ts` + controller + DTOs + tests | `GET /auth/session`, `POST /auth/logout`, optional verify proxy |
| `apps/shipshout-client-dashboard/package.json` | Chakra deps |
| `.../src/components/ui/provider.tsx` | Chakra Provider + color mode |
| `.../src/theme/index.ts` | Design tokens → Chakra system |
| `.../src/lib/auth/cookies.ts` | `applySetCookies`, session cookie name helpers |
| `.../src/lib/auth/api.ts` | `authFetch` |
| `.../src/lib/auth/actions.ts` | Server actions |
| `.../src/app/layout.tsx` | Font + Provider |
| `.../src/app/(auth)/layout.tsx` | Auth shell |
| `.../src/app/(auth)/login/page.tsx` (+ forms) | Login UI |
| `.../src/app/(auth)/register/page.tsx` | Register UI |
| `.../src/app/(auth)/forgot-password/page.tsx` | Forgot UI |
| `.../src/app/(auth)/reset-password/page.tsx` | Reset UI |
| `.../src/app/(auth)/verify-email/page.tsx` | Verify UI |
| `.../src/app/dashboard/page.tsx` | Placeholder + logout |
| `.../src/middleware.ts` | Session guard |
| `.../src/app/page.tsx` | Redirect home |
| Root / app `.env.example` | Document API URL vars |

---

### Task 1: Nest session + logout endpoints

**Files:**
- Modify: `libs/auth/src/lib/services/auth.service.ts`
- Modify: `libs/auth/src/lib/controllers/auth.controller.ts`
- Create: `libs/auth/src/lib/dto/session-response.dto.ts` (if needed)
- Modify: `libs/auth/src/lib/__tests__/auth.service.spec.ts`, `auth.controller.spec.ts`

**Interfaces:**
- Produces:
  - `getSession(headers): Promise<{ user, session } | null>`
  - `logout(headers): Promise<{ ok: true }>` returning Set-Cookie clears via `returnHeaders: true` when applicable
  - `GET /auth/session` → session JSON or 401/empty
  - `POST /auth/logout` → `{ ok: true }` + clear cookies

- [ ] **Step 1: Extend AuthService**

Use Better Auth API (names may be `getSession` / `signOut` on `this.betterAuth.api`):

```typescript
async getSession(requestHeaders: IncomingHttpHeaders) {
    try {
        const session = await this.betterAuth.api.getSession({ headers: fromNodeHeaders(requestHeaders) });
        return session ?? null;
    } catch (error) {
        AuthUtils.mapAuthError(error);
    }
}

async logout(requestHeaders: IncomingHttpHeaders): Promise<{ headers: Headers; body: OkResponseDto }> {
    try {
        const result = await this.betterAuth.api.signOut({
            headers: fromNodeHeaders(requestHeaders),
            returnHeaders: true,
        });
        return { headers: result.headers ?? new Headers(), body: { ok: true } };
    } catch (error) {
        AuthUtils.mapAuthError(error);
    }
}
```

If `signOut` / `getSession` naming differs, inspect `typeof this.betterAuth.api` / Better Auth docs and use the correct methods — do not invent alternate HTTP paths outside Better Auth.

- [ ] **Step 2: Controller routes**

```typescript
@Get('session')
@ApiOperation({ summary: 'Current session' })
async session(@Req() req: ExpressRequest) {
    return this.authService.getSession(req.headers);
}

@Post('logout')
@ApiOperation({ summary: 'Sign out' })
async logout(@Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response): Promise<OkResponseDto> {
    const result = await this.authService.logout(req.headers);
    AuthUtils.applyAuthCookies(res, result.headers);
    return result.body;
}
```

- [ ] **Step 3: Unit tests** — mock `api.getSession` / `api.signOut`; assert controller forwards cookies on logout.

- [ ] **Step 4: Run** `npx nx test auth --skip-nx-cache` — expect PASS; commit.

```bash
git add libs/auth
git commit -m "$(cat <<'EOF'
Add Nest auth session and logout endpoints.

EOF
)"
```

---

### Task 2: Chakra theme, provider, fonts

**Files:**
- Modify: `apps/shipshout-client-dashboard/package.json` (and workspace root install)
- Create: `apps/shipshout-client-dashboard/src/theme/index.ts`
- Create: `apps/shipshout-client-dashboard/src/components/ui/provider.tsx`
- Modify: `apps/shipshout-client-dashboard/src/app/layout.tsx`
- Modify: `apps/shipshout-client-dashboard/next.config.js` — `optimizePackageImports: ['@chakra-ui/react']` if supported

**Interfaces:**
- Produces: `Provider` wrapping app; theme tokens: `primary #0075de`, `canvas-soft #f6f5f4`, `ink #000`, `hairline #e6e6e6`, radii from `DESIGN.md`; dark semantic counterparts; `next/font` Inter as `--font-inter`

- [ ] **Step 1: Install**

```bash
cd /Users/samsimson/Development/shipshout
bun add @chakra-ui/react @emotion/react --filter @shipshout/shipshout-client-dashboard
# or add deps to apps/shipshout-client-dashboard/package.json and bun install at root
```

Optionally: `bunx @chakra-ui/cli snippet add` inside the app for `provider` snippet, then customize.

- [ ] **Step 2: Theme** — `createSystem` / `defaultConfig` (Chakra v3) mapping DESIGN.md colors; enable dark mode tokens for canvas/surface/ink.

- [ ] **Step 3: Provider** — `ChakraProvider` + `ColorModeProvider` (system default).

- [ ] **Step 4: Root layout**

```tsx
import { Inter } from 'next/font/google';
import { Provider } from '../components/ui/provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={inter.variable} suppressHydrationWarning>
            <body>
                <Provider>{children}</Provider>
            </body>
        </html>
    );
}
```

- [ ] **Step 5: Smoke** — `npx nx serve shipshout-client-dashboard` loads without error; commit.

```bash
git add apps/shipshout-client-dashboard package.json bun.lock
git commit -m "$(cat <<'EOF'
Add Chakra provider and DESIGN.md theme to client dashboard.

EOF
)"
```

---

### Task 3: Auth HTTP helpers + server actions

**Files:**
- Create: `apps/shipshout-client-dashboard/src/lib/auth/cookies.ts`
- Create: `apps/shipshout-client-dashboard/src/lib/auth/api.ts`
- Create: `apps/shipshout-client-dashboard/src/lib/auth/actions.ts`
- Create: `apps/shipshout-client-dashboard/src/lib/auth/types.ts`
- Create: `apps/shipshout-client-dashboard/specs/auth-cookies.spec.ts` (or under `src/lib/auth/__tests__/`)
- Document env in `.env.example` (root or app)

**Interfaces:**
- Produces:
  - `SESSION_COOKIE_NAMES = ['better-auth.session_token', '__Secure-better-auth.session_token']`
  - `applySetCookies(res: Response): Promise<void>` using `cookies()` from `next/headers`
  - `authFetch(path: string, init?: RequestInit): Promise<Response>`
  - `loginAction(formData): Promise<AuthActionResult>`
  - `registerAction`, `forgotPasswordAction`, `resetPasswordAction`, `checkUsernameAction`, `logoutAction`
  - `type AuthActionResult = { ok: true } | { ok: false; error: string }`

- [ ] **Step 1: Failing test for cookie parse/apply** (mock `cookies().set`)

- [ ] **Step 2: Implement `cookies.ts` + `api.ts`**

```typescript
// api.ts
export function getApiBaseUrl(): string {
    const url = process.env.SHIPSHOUT_API_URL;
    if (!url) throw new Error('SHIPSHOUT_API_URL is not set');
    return url.replace(/\/$/, '');
}

export async function authFetch(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${getApiBaseUrl()}${path}`, {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
        cache: 'no-store',
    });
}
```

`applySetCookies`: read `getSetCookie()` if available, else `headers.get('set-cookie')`; for each cookie, parse name/value/attrs; **omit Domain** when setting on Next so host-only cookies work cross-port; set Path=/ and mirror httpOnly/secure/sameSite when possible.

- [ ] **Step 3: Actions** — `'use server'`; on login/register success `await applySetCookies(res); redirect('/dashboard')`; on error parse Nest `{ message, statusCode }` JSON into `{ ok: false, error }`.

Logout: `POST /auth/logout` with `Cookie` header from `cookies().toString()` / forwarded cookie header; apply Set-Cookie clears; `redirect('/login')`.

- [ ] **Step 4: Tests pass; commit.**

```bash
git commit -m "$(cat <<'EOF'
Add dashboard auth server actions and cookie forwarding.

EOF
)"
```

---

### Task 4: Auth pages (login, register, forgot, reset) + social

**Files:**
- Create: `apps/shipshout-client-dashboard/src/app/(auth)/layout.tsx`
- Create: `apps/shipshout-client-dashboard/src/app/(auth)/login/page.tsx`
- Create: `apps/shipshout-client-dashboard/src/components/auth/login-form.tsx` (client)
- Create: register / forgot / reset pages + forms similarly
- Create: `apps/shipshout-client-dashboard/src/components/auth/social-buttons.tsx`
- Create: `apps/shipshout-client-dashboard/src/components/auth/auth-card.tsx`
- Modify: `apps/shipshout-client-dashboard/src/app/page.tsx` → redirect helper (session cookie → dashboard else login) — can be temporary until Task 6

**Interfaces:**
- Consumes: actions from Task 3; `NEXT_PUBLIC_SHIPSHOUT_API_URL`
- Produces: working forms calling actions; social hrefs `${NEXT_PUBLIC_SHIPSHOUT_API_URL}/auth/google|github`

- [ ] **Step 1: Auth layout** — centered card on `canvas-soft`; Shipshout wordmark; Chakra `Box`/`Stack`.

- [ ] **Step 2: Login form** — fields `login`, `password`; submit → `loginAction`; show error alert; links to register + forgot; `SocialButtons`.

- [ ] **Step 3: Register form** — name, username, email, password; optional debounce `checkUsernameAction`; submit → `registerAction`.

- [ ] **Step 4: Forgot + reset** — forgot email only; reset reads `searchParams.token`, newPassword + confirm client-side match then `resetPasswordAction`.

- [ ] **Step 5: Visual check against DESIGN.md (primary pill, hairline, body-sm inputs); commit.

```bash
git commit -m "$(cat <<'EOF'
Add Chakra auth pages with server-action forms and social links.

EOF
)"
```

---

### Task 5: Dashboard + logout + verify-email page

**Files:**
- Create: `apps/shipshout-client-dashboard/src/app/dashboard/page.tsx`
- Create: `apps/shipshout-client-dashboard/src/components/auth/logout-button.tsx`
- Create: `apps/shipshout-client-dashboard/src/app/(auth)/verify-email/page.tsx`
- Optionally Nest `GET /auth/verify-email` proxy — or client/server call to `${API}/auth-service/verify-email?token=`

**Interfaces:**
- Consumes: `logoutAction`; verify via fetch to Better Auth verify URL
- Produces: dashboard placeholder “You’re in” + Logout; verify page states: missing token / success / error

- [ ] **Step 1: Dashboard page** (server component) + client Logout button calling `logoutAction`.

- [ ] **Step 2: Verify-email** — if `token` query present, server-side fetch verify endpoint; render DESIGN.md-styled success/error; if no token, show “Check your email” copy (post-register deep link later).

- [ ] **Step 3: Commit.**

```bash
git commit -m "$(cat <<'EOF'
Add dashboard logout and verify-email page.

EOF
)"
```

---

### Task 6: Middleware session guard + home redirect

**Files:**
- Create: `apps/shipshout-client-dashboard/src/middleware.ts`
- Modify: `apps/shipshout-client-dashboard/src/app/page.tsx`
- Create/update: `.env.example` with `SHIPSHOUT_API_URL` and `NEXT_PUBLIC_SHIPSHOUT_API_URL`

**Interfaces:**
- Consumes: `SESSION_COOKIE_NAMES` from cookies helper (or duplicate constant safe for edge)
- Produces: redirects per spec

- [ ] **Step 1: Middleware**

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIES = ['better-auth.session_token', '__Secure-better-auth.session_token'];

export function middleware(request: NextRequest) {
    const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
    const { pathname } = request.nextUrl;
    const isAuthPage = ['/login', '/register', '/forgot-password'].includes(pathname);
    const isProtected = pathname.startsWith('/dashboard');

    if (isProtected && !hasSession) return NextResponse.redirect(new URL('/login', request.url));
    if (isAuthPage && hasSession) return NextResponse.redirect(new URL('/dashboard', request.url));
    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/login', '/register', '/forgot-password'],
};
```

- [ ] **Step 2: `/` page** — if any session cookie → redirect dashboard else login (can use same cookie check in a tiny server component).

- [ ] **Step 3: Manual checklist** — with API + dashboard running and env set: register → cookie set → middleware allows dashboard → logout clears → login required again.

- [ ] **Step 4: Commit.**

```bash
git commit -m "$(cat <<'EOF'
Add auth middleware guard and home redirects.

EOF
)"
```

---

## Spec coverage (self-review)

| Spec item | Task |
| --- | --- |
| Chakra + DESIGN.md + dark mode + Inter | Task 2 |
| Login/Register/Forgot/Reset + social | Task 4 |
| Server actions + cookie forward | Task 3 |
| `/dashboard` landing + logout | Task 5 |
| Verify-email page | Task 5 |
| Middleware guard | Task 6 |
| Nest session/logout | Task 1 |
| Swagger on Nest only | Task 1 (annotations); no Next Swagger |
| Env vars | Tasks 3–6 |

## Manual verification (end)

1. Set `SHIPSHOUT_API_URL` and `NEXT_PUBLIC_SHIPSHOUT_API_URL` to Nest origin.
2. `bun nx serve shipshout-api-svc` and `bun nx serve shipshout-client-dashboard`.
3. Register → land `/dashboard`; refresh stays; logout → `/login`.
4. Login with username and with email; forgot/reset with token from logs; Google/GitHub start redirects; verify-email with token; toggle OS dark mode.
