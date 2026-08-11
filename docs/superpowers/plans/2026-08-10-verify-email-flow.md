# Verify Email Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Nest Better Auth email verification (send + verify + resend) and finish the client-dashboard `/verify-email` flow so register lands on check-inbox, email links confirm via Nest, and success only CTAs to login.

**Architecture:** Nest owns BA wrappers (`sendVerificationEmail` config rewrite to `{CLIENT_APP_URL}/verify-email?token=…`, `POST /auth/verify-email`, `POST /auth/resend-verification`). Dashboard uses server actions / server fetch to Nest only (no `/auth-service` calls). Register redirects to `/verify-email?email=…` when no session token.

**Tech Stack:** NestJS `@shipshout/auth`, Better Auth 1.6 (`api.verifyEmail` GET query; `api.sendVerificationEmail` POST body), Next.js App Router server actions, Chakra UI v3, Jest, bun/Nx

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-10-verify-email-flow-design.md`
- Nest always calls Better Auth internally; pass **plain objects** into BA APIs (never Nest DTO class instances).
- `autoSignInAfterVerification: false` — verify must not apply session cookies.
- Resend always returns `{ ok: true }` to HTTP clients (no enumeration).
- UI: read root `DESIGN.md` before editing dashboard UI; reuse `AuthCard` / `AuthInput` / auth button styles.
- Prettier: 4-space, single quotes, printWidth 160; one-line single-statement `if`s.
- Env: `CLIENT_APP_URL` (e.g. `http://localhost:3000`); keep existing `SHIPSHOUT_API_URL` / `BETTER_AUTH_*`.
- Package manager: bun; run auth tests via `npx nx test auth`.

## File map

| File                                                      | Responsibility                                           |
| --------------------------------------------------------- | -------------------------------------------------------- |
| `libs/auth/src/lib/contracts/schema/auth.schema.ts`       | Add `clientAppUrl`                                       |
| `libs/auth/src/lib/auth.config.ts`                        | `emailVerification.sendVerificationEmail` + link rewrite |
| `libs/auth/src/lib/utils/auth-http.ts`                    | `sendVerificationEmail` helper                           |
| `libs/auth/src/lib/dto/verify-email.dto.ts`               | `{ token }`                                              |
| `libs/auth/src/lib/dto/resend-verification.dto.ts`        | `{ email }`                                              |
| `libs/auth/src/lib/services/auth.service.ts`              | `verifyEmail`, `resendVerification`                      |
| `libs/auth/src/lib/controllers/auth.controller.ts`        | Nest routes                                              |
| `libs/auth/.../__tests__/*`                               | Unit coverage                                            |
| `apps/shipshout-api-svc/src/app/app.module.ts`            | Inject `CLIENT_APP_URL`                                  |
| `.env.example` (+ local `.env` if needed)                 | Document `CLIENT_APP_URL`                                |
| `apps/shipshout-client-dashboard/src/lib/auth/actions.ts` | Register redirect + resend action                        |
| `apps/.../components/auth/resend-verification-form.tsx`   | Resend UI                                                |
| `apps/.../app/(auth)/verify-email/page.tsx`               | Awaiting / success / error states via Nest               |

---

### Task 1: Nest email verification send config + adapter

**Files:**

- Modify: `libs/auth/src/lib/contracts/schema/auth.schema.ts`
- Modify: `libs/auth/src/lib/auth.config.ts`
- Modify: `libs/auth/src/lib/utils/auth-http.ts`
- Modify: `libs/auth/src/lib/__tests__/auth-http.spec.ts`
- Modify: `apps/shipshout-api-svc/src/app/app.module.ts`
- Modify: `.env.example`
- Modify: `.env` (local only; do not commit secrets)

**Interfaces:**

- Consumes: existing `EmailAdapter.send`, `AuthOptions`
- Produces:
    - `AuthOptions.clientAppUrl: string` (required)
    - `AuthUtils.sendVerificationEmail(user: { email: string }, url: string): Promise<void>`
    - BA `emailVerification.sendVerificationEmail` builds `url = \`${opts.clientAppUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}\``

- [ ] **Step 1: Write failing adapter test**

Add to `auth-http.spec.ts`:

```typescript
describe('sendVerificationEmail', () => {
    it('sends verification email via the adapter', async () => {
        const send = jest.spyOn(EmailAdapter.prototype, 'send').mockResolvedValue(undefined);

        await AuthUtils.sendVerificationEmail({ email: 'ada@example.com' }, 'http://localhost:3000/verify-email?token=abc');

        expect(send).toHaveBeenCalledWith({
            to: 'ada@example.com',
            subject: 'Verify your email',
            text: 'http://localhost:3000/verify-email?token=abc',
            html: '<p>Verify your email:</p><p><a href="http://localhost:3000/verify-email?token=abc">http://localhost:3000/verify-email?token=abc</a></p>',
        });

        send.mockRestore();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test auth --testPathPattern=auth-http`

Expected: FAIL — `sendVerificationEmail` missing on `AuthUtils`

- [ ] **Step 3: Implement schema, util, config, env wiring**

`auth.schema.ts` — add:

```typescript
clientAppUrl: z.string().url(),
```

`auth-http.ts` — add:

```typescript
static async sendVerificationEmail(user: { email: string }, url: string): Promise<void> {
    await this.emailAdapter.send({
        to: user.email,
        subject: 'Verify your email',
        text: url,
        html: `<p>Verify your email:</p><p><a href="${url}">${url}</a></p>`,
    });
}
```

`auth.config.ts` — inside `betterAuth({...})`:

```typescript
emailVerification: {
    sendVerificationEmail: async ({ user, token }) => {
        const base = (opts.clientAppUrl ?? '').replace(/\/$/, '');
        const url = `${base}/verify-email?token=${encodeURIComponent(token)}`;
        await AuthUtils.sendVerificationEmail(user, url);
    },
    autoSignInAfterVerification: false,
},
```

Keep existing `emailAndPassword.requireEmailVerification: true`.

`app.module.ts` factory — add:

```typescript
clientAppUrl: configService.getOrThrow<string>('CLIENT_APP_URL'),
```

`.env.example`:

```
CLIENT_APP_URL=http://localhost:3000
```

Add the same to local `.env` (do not commit).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx nx test auth --testPathPattern=auth-http`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add libs/auth/src/lib/contracts/schema/auth.schema.ts \
  libs/auth/src/lib/auth.config.ts \
  libs/auth/src/lib/utils/auth-http.ts \
  libs/auth/src/lib/__tests__/auth-http.spec.ts \
  apps/shipshout-api-svc/src/app/app.module.ts \
  .env.example
git commit -m "$(cat <<'EOF'
feat(auth): send verification emails to dashboard verify link

EOF
)"
```

---

### Task 2: Nest `POST /auth/verify-email` + `POST /auth/resend-verification`

**Files:**

- Create: `libs/auth/src/lib/dto/verify-email.dto.ts`
- Create: `libs/auth/src/lib/dto/resend-verification.dto.ts`
- Modify: `libs/auth/src/lib/services/auth.service.ts`
- Modify: `libs/auth/src/lib/controllers/auth.controller.ts`
- Modify: `libs/auth/src/lib/__tests__/auth.service.spec.ts`
- Modify: `libs/auth/src/lib/__tests__/auth.controller.spec.ts`

**Interfaces:**

- Consumes: `betterAuth.api.verifyEmail({ query: { token } })`, `betterAuth.api.sendVerificationEmail({ body: { email, callbackURL? }, headers })`
- Produces:
    - `AuthService.verifyEmail(body, headers): Promise<OkResponseDto>` → `{ ok: true }`
    - `AuthService.resendVerification(body, headers): Promise<OkResponseDto>` → always `{ ok: true }`
    - `POST /auth/verify-email` body `{ token: string }`
    - `POST /auth/resend-verification` body `{ email: string }`
- Note: BA `verifyEmail` is GET; call with **query**, omit `callbackURL` so errors throw instead of redirect. Do **not** use `returnHeaders: true` / do not apply cookies on verify.

- [ ] **Step 1: Write failing service tests**

In `auth.service.spec.ts`, extend `api` mock:

```typescript
verifyEmail: jest.fn(),
sendVerificationEmail: jest.fn(),
```

Add cases:

```typescript
it('verifyEmail calls BA with query token and returns ok', async () => {
    api.verifyEmail.mockResolvedValue({ status: true, user: { id: '1' } });
    await expect(service.verifyEmail({ token: 'tok' }, {})).resolves.toEqual({ ok: true });
    expect(api.verifyEmail).toHaveBeenCalledWith(expect.objectContaining({ query: { token: 'tok' } }));
});

it('resendVerification returns ok even when BA throws', async () => {
    api.sendVerificationEmail.mockRejectedValue(new Error('nope'));
    await expect(service.resendVerification({ email: 'a@b.com' }, {})).resolves.toEqual({ ok: true });
});

it('resendVerification calls BA with plain email payload', async () => {
    api.sendVerificationEmail.mockResolvedValue({ status: true });
    await service.resendVerification({ email: 'a@b.com' }, {});
    expect(api.sendVerificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
            body: expect.objectContaining({ email: 'a@b.com' }),
        }),
    );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx nx test auth --testPathPattern=auth.service`

Expected: FAIL — methods missing

- [ ] **Step 3: Add DTOs + service + controller**

`verify-email.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class VerifyEmailDto {
    @ApiProperty({ description: 'Email verification token from the link' })
    @IsString()
    @MinLength(1)
    token!: string;
}
```

`resend-verification.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
    @ApiProperty({ example: 'ada@example.com' })
    @IsEmail()
    email!: string;
}
```

`auth.service.ts`:

```typescript
async verifyEmail(body: VerifyEmailDto, requestHeaders: IncomingHttpHeaders): Promise<OkResponseDto> {
    try {
        await this.betterAuth.api.verifyEmail({
            query: { token: body.token },
            headers: fromNodeHeaders(requestHeaders),
        });
        return { ok: true };
    } catch (error) {
        AuthUtils.mapAuthError(error);
    }
}

async resendVerification(body: ResendVerificationDto, requestHeaders: IncomingHttpHeaders): Promise<OkResponseDto> {
    try {
        await this.betterAuth.api.sendVerificationEmail({
            body: { email: body.email },
            headers: fromNodeHeaders(requestHeaders),
        });
    } catch {
        // Intentionally swallow — do not reveal account existence / state
    }
    return { ok: true };
}
```

Controller endpoints (mirror forgot/reset style):

```typescript
@Post('verify-email')
@ApiOperation({ summary: 'Verify email with token' })
@ApiBody({ type: VerifyEmailDto })
@ApiResponse({ status: 200, type: OkResponseDto })
@ApiResponse({ status: 400, description: 'Invalid or expired token' })
async verifyEmail(@Body() body: VerifyEmailDto, @Req() req: ExpressRequest): Promise<OkResponseDto> {
    return this.authService.verifyEmail(body, req.headers);
}

@Post('resend-verification')
@ApiOperation({ summary: 'Resend verification email' })
@ApiBody({ type: ResendVerificationDto })
@ApiResponse({ status: 200, type: OkResponseDto })
async resendVerification(@Body() body: ResendVerificationDto, @Req() req: ExpressRequest): Promise<OkResponseDto> {
    return this.authService.resendVerification(body, req.headers);
}
```

Update `auth.controller.spec.ts` with two delegate tests (same pattern as `forgotPassword`).

- [ ] **Step 4: Run auth tests**

Run: `npx nx test auth`

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add libs/auth/src/lib/dto/verify-email.dto.ts \
  libs/auth/src/lib/dto/resend-verification.dto.ts \
  libs/auth/src/lib/services/auth.service.ts \
  libs/auth/src/lib/controllers/auth.controller.ts \
  libs/auth/src/lib/__tests__/auth.service.spec.ts \
  libs/auth/src/lib/__tests__/auth.controller.spec.ts
git commit -m "$(cat <<'EOF'
feat(auth): add verify-email and resend-verification endpoints

EOF
)"
```

---

### Task 3: Dashboard register → `/verify-email` + Nest-backed verify/resend UI

**Files:**

- Modify: `apps/shipshout-client-dashboard/src/lib/auth/actions.ts`
- Create: `apps/shipshout-client-dashboard/src/components/auth/resend-verification-form.tsx`
- Modify: `apps/shipshout-client-dashboard/src/app/(auth)/verify-email/page.tsx`
- Do **not** change `proxy.ts` matcher (keep `/verify-email` off guest bounce list)

**Interfaces:**

- Consumes: `POST /auth/verify-email`, `POST /auth/resend-verification`, existing `authFetch` / `applySetCookies` / `readErrorMessage`
- Produces:
    - `registerAction` → on success without session token: `redirect('/verify-email?email=…')` (no cookie apply); with session token: keep cookie apply + `/dashboard`
    - `resendVerificationAction(formData): Promise<AuthActionResult>`
    - Page states: awaiting / verified / failed

- [ ] **Step 1: Update `registerAction` + add `resendVerificationAction`**

```typescript
export async function registerAction(formData: FormData): Promise<AuthActionResult> {
    const name = field(formData, 'name');
    const username = field(formData, 'username');
    const email = field(formData, 'email');
    const password = field(formData, 'password');
    const displayUsername = field(formData, 'displayUsername') || undefined;
    if (!name || !username || !email || !password) return { ok: false, error: 'All fields are required' };

    const response = await authFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, username, email, password, displayUsername }),
    });
    if (!response.ok) return { ok: false, error: await readErrorMessage(response) };

    const payload = (await response.json()) as { session?: { token?: string | null } };
    const token = payload.session?.token;
    if (token) {
        // Rare when requireEmailVerification is on; keep defensive path
        await applySetCookies(response);
        redirect('/dashboard');
    }
    redirect(`/verify-email?email=${encodeURIComponent(email)}`);
}
```

**Important:** `applySetCookies` must run **before** consuming the body if cookies are needed. Prefer:

```typescript
const clone = response.clone();
const payload = (await response.json()) as { session?: { token?: string | null } };
if (payload.session?.token) {
    await applySetCookies(clone);
    redirect('/dashboard');
}
redirect(`/verify-email?email=${encodeURIComponent(email)}`);
```

Or parse `Set-Cookie` only when token present by re-fetching headers from the original `response` (headers still available after `json()`):

```typescript
const payload = (await response.json()) as { session?: { token?: string | null } };
if (payload.session?.token) {
    await applySetCookies(response);
    redirect('/dashboard');
}
redirect(`/verify-email?email=${encodeURIComponent(email)}`);
```

(`Headers` remain readable after body consume — use that.)

```typescript
export async function resendVerificationAction(formData: FormData): Promise<AuthActionResult> {
    const email = field(formData, 'email');
    if (!email) return { ok: false, error: 'Email is required' };

    const response = await authFetch('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
    if (!response.ok) return { ok: false, error: await readErrorMessage(response) };
    return { ok: true };
}
```

- [ ] **Step 2: Build `ResendVerificationForm`**

Create client component modeled on `forgot-password-form.tsx`:

- Props: `defaultEmail?: string`
- Fields: email (`AuthInput`, `defaultValue={defaultEmail}`)
- On success: alert copy exactly: `If an account exists, we sent a link.`
- Primary button: `Resend verification email`
- Link: Back to login

- [ ] **Step 3: Rewrite `verify-email/page.tsx`**

Remove direct `/auth-service/verify-email` fetch. Use Nest:

```typescript
async function verifyEmailToken(token: string): Promise<{ ok: boolean; message: string }> {
    try {
        const response = await authFetch('/auth/verify-email', {
            method: 'POST',
            body: JSON.stringify({ token }),
            cache: 'no-store',
        });
        if (response.ok) return { ok: true, message: 'Email verified. You can log in.' };
        return { ok: false, message: await readErrorMessage(response) };
    } catch {
        return { ok: false, message: 'Could not verify email right now. Try again later.' };
    }
}
```

Page behavior:

- No `token`: `AuthCard` title `Verify your email`; muted check-inbox copy; `<ResendVerificationForm defaultEmail={params.email} />`
- With `token`: call `verifyEmailToken`; success/error `Alert`; success → prominent `<Link href="/login">Log in</Link>`; failure → show `ResendVerificationForm` as well

Import `authFetch` / `readErrorMessage` from `../../../lib/auth/api` (server component OK).

- [ ] **Step 4: Manual smoke (API + dashboard running)**

1. Ensure `CLIENT_APP_URL=http://localhost:3000` and rebuild/restart API (`npx nx build auth` if needed).
2. Register a new user → lands on `/verify-email?email=…`.
3. Copy link from API logs → open → success + Log in.
4. Resend from awaiting state → console shows another email.
5. Bad token → error state.
6. Login with verified user → `/dashboard`.

- [ ] **Step 5: Commit**

```bash
git add apps/shipshout-client-dashboard/src/lib/auth/actions.ts \
  apps/shipshout-client-dashboard/src/components/auth/resend-verification-form.tsx \
  apps/shipshout-client-dashboard/src/app/(auth)/verify-email/page.tsx
git commit -m "$(cat <<'EOF'
feat(dashboard): complete verify-email check-inbox and confirm flow

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement                                                   | Task                         |
| ------------------------------------------------------------------ | ---------------------------- |
| `emailVerification.sendVerificationEmail` + dashboard link rewrite | Task 1                       |
| `CLIENT_APP_URL` / `clientAppUrl`                                  | Task 1                       |
| `autoSignInAfterVerification: false`                               | Task 1                       |
| `POST /auth/verify-email` → BA `verifyEmail`                       | Task 2                       |
| `POST /auth/resend-verification` always `{ ok: true }`             | Task 2                       |
| Register → `/verify-email?email=` when no session                  | Task 3                       |
| Nest-backed verify page (not `/auth-service`)                      | Task 3                       |
| Resend form + non-enumerating copy                                 | Task 3                       |
| Success → login CTA only                                           | Task 3                       |
| Proxy leaves `/verify-email` reachable                             | Task 3 (explicit non-change) |

## Manual verification (end)

1. Fresh register → check-inbox page (not dashboard).
2. Verification email URL host is dashboard (`:3000`), path `/verify-email?token=…`.
3. Confirm → success → login works; no session cookie set by verify alone.
4. Resend works; unknown email still returns success UI.
5. Invalid token shows error + resend.
