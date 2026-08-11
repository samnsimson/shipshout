# Auth Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Nest `/auth` endpoints for register, login, forgot/reset password, and Google/GitHub OAuth start, wrapping Better Auth with cookie + JSON session responses and a pluggable email adapter (logging stub).

**Architecture:** `AuthController` calls `AuthService.api.*` with `fromNodeHeaders` and `returnHeaders: true` to forward `Set-Cookie`. `createAuth` wires `sendResetPassword` to an `EmailAdapter`. OAuth callbacks remain on Better Auth `basePath` `/auth-service`.

**Tech Stack:** NestJS 11, `@thallesp/nestjs-better-auth`, `better-auth`, `class-validator`, `@nestjs/swagger` / `@shipshout/swagger`, bun, Jest

## Global Constraints

- Nest wrappers under `/auth`; BA callbacks under `/auth-service`.
- Login/register: Set-Cookie **and** `{ user, session }` body.
- Forgot/reset: `{ ok: true }`; no email enumeration on forgot.
- Email: `EmailAdapter` + default `LoggingEmailAdapter`; no Resend this pass.
- Social: `GET /auth/google` / `GET /auth/github` via `signInSocial`.
- Map BA errors to Nest HTTP exceptions; preserve multiple Set-Cookie headers.
- Specs under `__tests__/`; Prettier 4-space, single quotes, printWidth 160; one-line single-statement `if`s.
- Lib Nest path does not read `process.env` for email (inject adapter).

## File map

| File                                               | Responsibility                                                   |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| `libs/auth/src/lib/email/email-adapter.ts`         | `EmailAdapter` interface + `EMAIL_ADAPTER` token                 |
| `libs/auth/src/lib/email/logging-email.adapter.ts` | Default logging implementation                                   |
| `libs/auth/src/lib/auth.config.ts`                 | `createAuth(opts, emailAdapter)` + CLI export                    |
| `libs/auth/src/lib/auth.options.ts`                | Optional `emailAdapter` on async options / AuthOptions if needed |
| `libs/auth/src/lib/dto/*.ts`                       | Request/response DTOs                                            |
| `libs/auth/src/lib/controllers/auth.controller.ts` | HTTP endpoints                                                   |
| `libs/auth/src/lib/utils/auth-http.ts`             | Cookie forward + BA error mapping helpers                        |
| `libs/auth/src/lib/auth.module.ts`                 | Register providers + controller                                  |
| `libs/auth/src/index.ts`                           | Public exports                                                   |
| `libs/auth/src/lib/__tests__/*`                    | Unit tests                                                       |
| `libs/auth/package.json`                           | Add swagger/validator deps as needed                             |

---

### Task 1: Email adapter

**Files:**

- Create: `libs/auth/src/lib/email/email-adapter.ts`
- Create: `libs/auth/src/lib/email/logging-email.adapter.ts`
- Create: `libs/auth/src/lib/__tests__/logging-email.adapter.spec.ts`
- Modify: `libs/auth/src/index.ts`

**Interfaces:**

- Produces:
    - `EMAIL_ADAPTER = Symbol('EMAIL_ADAPTER')`
    - `EmailMessage = { to: string; subject: string; html?: string; text?: string }`
    - `EmailAdapter = { send(message: EmailMessage): Promise<void> }`
    - `class LoggingEmailAdapter implements EmailAdapter`

- [ ] **Step 1: Write failing test** for LoggingEmailAdapter (spy Logger).
- [ ] **Step 2: Implement adapter + token; export; make test pass; commit.**

---

### Task 2: Wire createAuth + module options

**Files:**

- Modify: `libs/auth/src/lib/auth.config.ts`
- Modify: `libs/auth/src/lib/auth.options.ts`
- Modify: `libs/auth/src/lib/auth.module.ts`
- Modify: `libs/auth/src/lib/contracts/schema/auth.schema.ts` (optional emailRedirectUrl / keep minimal)
- Test: extend `auth.module.spec.ts`

**Interfaces:**

- `createAuth(opts: AuthOptions, emailAdapter: EmailAdapter)`
- `emailAndPassword: { enabled: true, sendResetPassword: async ({ user, url }) => emailAdapter.send(...) }`
- Only include socialProviders entries when clientId and clientSecret are non-empty
- `AuthModuleAsyncOptions` may include `emailAdapter?: EmailAdapter` **or** provide via DI token in module providers from factory
- Prefer: module provides `{ provide: EMAIL_ADAPTER, useFactory: () => options.emailAdapter ?? new LoggingEmailAdapter() }` but BetterAuth `createAuth` runs inside BetterAuthModule useFactory — pass adapter into `createAuth` from the same closure: `const adapter = options.emailAdapter ?? new LoggingEmailAdapter()` then also register that instance as `EMAIL_ADAPTER` for future injectors

- [ ] **Step 1: Update createAuth + forRootAsync; CLI auth uses LoggingEmailAdapter; tests; commit.**

---

### Task 3: DTOs + HTTP helpers

**Files:**

- Create: `libs/auth/src/lib/dto/register.dto.ts`, `login.dto.ts`, `forgot-password.dto.ts`, `reset-password.dto.ts`, `auth-session-response.dto.ts`, `ok-response.dto.ts`
- Create: `libs/auth/src/lib/utils/auth-http.ts`
- Create: `libs/auth/src/lib/__tests__/auth-http.spec.ts`

**Interfaces:**

- DTOs with `class-validator` + `@ApiProperty`
- `applyAuthCookies(res: Response, headers: Headers): void` — copy every `set-cookie`
- `mapAuthError(error: unknown): never` — throw Nest HttpException from BA `APIError` status/code

- [ ] **Step 1: Implement DTOs + helpers + tests; add package deps (`class-validator`, `class-transformer`, `@nestjs/swagger`, `@shipshout/swagger` as needed); commit.**

---

### Task 4: AuthController endpoints

**Files:**

- Modify: `libs/auth/src/lib/controllers/auth.controller.ts`
- Create: `libs/auth/src/lib/__tests__/auth.controller.spec.ts`
- Modify: `libs/auth/package.json` if missing `@shipshout/swagger`

**Interfaces:**

- `@Controller('auth')` + `@AllowAnonymous()` (class-level)
- Methods call:
    - `this.authService.api.signUpEmail({ body, headers: fromNodeHeaders(req.headers), returnHeaders: true })`
    - same pattern for `signInEmail`, `requestPasswordReset`, `resetPassword`
    - social: `signInSocial({ body: { provider, callbackURL? }, headers, returnHeaders: true })` then `res.redirect(url)` when redirect URL present
- OpenAPI via `@ApiTags('auth')` + `@ApiOperation` / `@ApiResponse` (and `@ApiBody` where needed); follow project Swagger rules

- [ ] **Step 1: Failing controller tests with mocked AuthService.**
- [ ] **Step 2: Implement controller; pass tests; `nx test auth` + `nx build auth`; commit.**

---

## Spec coverage

| Spec item                                         | Task |
| ------------------------------------------------- | ---- |
| EmailAdapter + logging                            | 1    |
| createAuth sendResetPassword + social conditional | 2    |
| DTOs + cookie/error helpers                       | 3    |
| Six Nest routes + OpenAPI                         | 4    |
| Cookie + body / ok responses                      | 4    |
| Unit tests                                        | 1–4  |
